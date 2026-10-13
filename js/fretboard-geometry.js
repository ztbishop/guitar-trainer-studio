// SVG neck coordinates only. Frets and note centers deliberately differ.
export function fretboardGeometry(maxFret = 24, stringCount = 6) {
  const span = 1 - 2 ** (-maxFret / 12);
  const lastWidth = 2 ** (-(maxFret - 1) / 12) - 2 ** (-maxFret / 12);
  // Preserve readable high-fret cells instead of shrinking markers on long necks.
  const width = Math.max(1200, Math.ceil(160 + 20 * span / lastWidth));
  const stringGap = 20, firstY = 32, lastY = firstY + (stringCount - 1) * stringGap;
  return {width, height: lastY + 17, nutX: 100, endX: width - 60, firstY, lastY, stringGap, top: 22, bottom: lastY + 11};
}

export function fretInlayYs(stringCount, double = false) {
  const {firstY, lastY, stringGap} = fretboardGeometry(24, stringCount);
  if(!double || stringCount < 3)return [(firstY + lastY) / 2];
  // Use symmetric string gaps near the neck's quarter points. On six strings,
  // these are the gaps between strings 2–3 and 4–5, rather than the center gap.
  const upperGap = Math.max(0, Math.round((stringCount - 1) / 4 - 0.5)) + 0.5;
  return [firstY + upperGap * stringGap, lastY - upperGap * stringGap];
}

export function fretWireX(fret, maxFret, leftHanded = false) {
  const {width, nutX, endX} = fretboardGeometry(maxFret);
  const x = nutX + (endX - nutX) * (1 - 2 ** (-fret / 12)) / (1 - 2 ** (-maxFret / 12));
  return leftHanded ? width - x : x;
}

export function fretX(fret, maxFret, leftHanded = false) {
  const {width, nutX} = fretboardGeometry(maxFret);
  const x = fret === 0 ? nutX - 24 : (fretWireX(fret - 1, maxFret) + fretWireX(fret, maxFret)) / 2;
  return leftHanded ? width - x : x;
}
