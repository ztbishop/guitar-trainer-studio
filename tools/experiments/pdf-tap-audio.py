"""Compare sparse-tap estimates using the original Arirang performance.

Input is mono float32 little-endian PCM at 11025 Hz, extracted from the video.
Requires numpy. No score export, saved alignment or MIDI is read.
"""
import argparse
import numpy as np


def attack_features(samples, rate):
    # Combine changes in bass energy with changes higher up the instrument.
    # Short hops locate attacks. A longer analysis window separates bass notes.
    hop, size = 110, 1024
    frames = np.lib.stride_tricks.sliding_window_view(samples, size)[::hop]
    spectrum = abs(np.fft.rfft(frames * np.hanning(size)))
    change = np.maximum(0, spectrum[3:] - spectrum[:-3])
    bins = np.fft.rfftfreq(size, 1 / rate)
    bass = change[:, (bins >= 55) & (bins < 160)].sum(axis=1)
    treble = change[:, (bins >= 160) & (bins < 3000)].sum(axis=1)
    times = (np.arange(len(change)) * hop + 3 * hop + size / 2) / rate
    return times, bass, treble


def estimate(first, last, start, end, features):
    times, bass, treble = features
    duration = (end - start) / (last - first)
    passage = (times >= start) & (times <= end)
    def normalized(band):
        return band / max(1e-9, np.percentile(band[passage], 95))
    accents = normalized(bass) + 0.35 * normalized(treble)
    # Also try choosing a sequence of downbeats jointly. A long bar can absorb
    # a hold without forcing every earlier downbeat to arrive late.
    peaks = np.flatnonzero(passage & (times > start) & (times < end) &
                           (accents > np.roll(accents, 1)) & (accents >= np.roll(accents, -1)))
    choices = np.r_[start, times[peaks], end]
    rewards = np.r_[0, np.log1p(accents[peaks]), 0]
    scores = np.full(len(choices), -np.inf)
    scores[0] = 0
    parents = []
    for step in range(1, last - first + 1):
        following = np.full_like(scores, -np.inf)
        parent = np.zeros(len(choices), dtype=int)
        for j in ([len(choices)-1] if step == last-first else range(1, len(choices)-1)):
            ratio = (choices[j] - choices) / duration
            eligible = np.flatnonzero((ratio >= 0.4) & (ratio <= 2.75) & np.isfinite(scores))
            if not len(eligible):
                continue
            rank = scores[eligible] - 1.5 * np.log(ratio[eligible]) ** 2
            best = np.argmax(rank)
            parent[j] = eligible[best]
            following[j] = rank[best] + rewards[j]
        parents.append(parent)
        scores = following
    sequence = []
    if np.isfinite(scores[-1]):
        j = len(choices)-1
        for parent in reversed(parents):
            j = parent[j]
            sequence.append(choices[j])
        sequence.reverse()
    results = []
    for bar in range(first + 1, last):
        linear = start + (bar - first) * duration
        radius = min(1.0, duration * 0.35)
        candidates = np.flatnonzero(abs(times - linear) <= radius)
        proximity = 1 - 0.45 * abs(times[candidates] - linear) / radius
        peak = candidates[np.argmax(accents[candidates] * proximity)]
        joint = sequence[bar-first] if sequence else linear
        results.append((bar, linear, times[peak], joint))
    return results


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('pcm')
    args = parser.parse_args()
    samples = np.fromfile(args.pcm, dtype='<f4', count=11025*49)
    features = attack_features(samples, 11025)
    # Approximate reference annotations: follow the bass in the printed first
    # system (D D B), then B G G, then A A and the theme's low D and B.
    # The local rise of each sounding bass pitch identifies its new attack.
    reference = [None, 1.36, 4.76, 7.54, 10.12, 12.67, 15.67, 17.82, 20.26, 25.88,
                 28.52, 31.14, 33.86, 36.42, 39.00, 41.51, 44.21, 46.98]
    for first, last in [(1, 5), (5, 9), (8, 10), (10, 14), (14, 17)]:
        print(f'Pins M{first} and M{last} | measure / reference / linear / local attack / joint attacks (seconds)')
        for bar, linear, audio, joint in estimate(first, last, reference[first], reference[last], features):
            print(f'M{bar:2}  {reference[bar]:6.2f}  {linear:6.2f}  {audio:6.2f}  {joint:6.2f}')
    for first,last,start_offset,end_offset in [(1,9,0,0),(5,9,.18,-.18),(1,17,0,0)]:
        errors = []
        for bar,linear,local,joint in estimate(first,last,reference[first]+start_offset,
                                              reference[last]+end_offset,features):
            errors.append(abs(np.array([linear,local,joint])-reference[bar]))
        print(f'M{first}–{last}, tap offsets {start_offset:+.2f}/{end_offset:+.2f}, '
              f'max errors [linear, local, joint]: {np.round(np.max(errors,axis=0),2)}')


if __name__ == '__main__':
    main()
