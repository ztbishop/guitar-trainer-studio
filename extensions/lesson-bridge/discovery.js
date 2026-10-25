// SPDX-License-Identifier: AGPL-3.0-or-later
// Pure discovery helpers. Candidate identity is not evidence of score/media alignment.
export function webUrl(value, base) {
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function classifyResource(raw, base) {
  const url = webUrl(raw.url, base);
  if (!url) return null;
  let path = new URL(url).pathname;
  // TrueFire download labels can say GPX while the redirect actually names GP5.
  if (/\/soundsliceappshell\/.*\/soundfonts\//i.test(path)) return null;
  const encoded = path.match(/\/api\/(?:eq|site\/courses)\/redirect\/([^/]+)(?:\/\d+)?$/)?.[1];
  if (encoded) {
    try {
      const decoded = atob(decodeURIComponent(encoded).replace(/-/g, '+').replace(/_/g, '/'));
      const target = webUrl(decoded);
      if (target) path = new URL(target).pathname;
      else if (!decoded.includes('://')) path = decoded.split('?')[0];
    } catch { /* Keep the original link; never execute or fetch the decoded string. */ }
  }
  const hint = String(raw.label || '').slice(0, 180);
  let kind, detail;
  if (youtubeVideoId(url)) {kind='Recording';detail='YouTube video';}
  else if (/\.(gp[3-5]?|gpx|musicxml|mxl|xml)$/i.test(path)) {
    kind = 'Score'; detail = path.split('.').pop().toUpperCase();
  } else if (/\.(m3u8|mpd)$/i.test(path)) {
    kind = 'Recording'; detail = 'Streaming playlist; playback support unverified';
  } else if (/\.(mp4|webm|mov|m4v|mp3|m4a|wav|ogg|aac|flac)$/i.test(path)) {
    kind = 'Recording'; detail = 'Media candidate; may be a jamtrack';
  } else if (/sync[^/]*\.json$/i.test(path) || (/\.json$/i.test(path) && /syncpoint|sync_point|sync.*url/i.test(hint))) {
    if (/\/slices\/\/_sync\.json$/i.test(path)) return null;
    kind = 'Timing'; detail = 'Timing JSON candidate';
  } else if (/soundslice_manifest/i.test(path)) {
    kind = 'Manifest'; detail = 'TrueFire player resource list';
  } else if (/guitar\s*pro|download\s*gp[x3-5]?\b/i.test(hint)) {
    kind = 'Score'; detail = 'Download label only; file format unverified';
  } else if (/^(video|audio|source)$/.test(raw.origin || '') || (raw.origin === 'TrueFire manifest' && /video|audio|mp4|hls|stream/i.test(hint))) {
    kind = 'Recording'; detail = 'Player source; file format unverified';
  } else if (/^(www\.)?soundslice\.com$/i.test(new URL(url).hostname) && /\/(scores|slices)\//.test(path)) {
    kind='Player';detail='Soundslice player link';
  } else return null;
  let fileName=path.split('/').pop() || '';try{fileName=decodeURIComponent(fileName);}catch{/* Keep literal malformed escapes. */}
  return {url, kind, detail, fileName:fileName.slice(0,240), label:hint, origin:String(raw.origin || 'page').slice(0, 80)};
}

export function youtubeVideoId(value) {
  try {
    const u=new URL(value);let id;
    if(u.hostname==='youtu.be')id=u.pathname.slice(1).split('/')[0];
    else if(['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(u.hostname))id=u.searchParams.get('v') || u.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    return /^[\w-]{11}$/.test(id || '')?id:null;
  } catch {return null;}
}

export function redirectDestination(value) {
  const encoded = new URL(value).pathname.match(/\/api\/eq\/redirect\/([^/]+)(?:\/\d+)?$/)?.[1];
  try { return encoded ? webUrl(atob(decodeURIComponent(encoded).replace(/-/g,'+').replace(/_/g,'/'))) : null; }
  catch { return null; }
}

export function discoverResources(raw, base,{includeOther=false}={}) {
  const seen = new Set(), result = [];
  for (const item of raw.slice(0, 2500)) {
    let candidate = classifyResource(item, base);
    if(!candidate && includeOther) {
      const url=webUrl(item.url,base);
      if(url && /\.json(?:[?#]|$)|\.pdf(?:[?#]|$)|\/redirect\/|download|attachment/i.test(url) && !/soundfonts|analytics|telemetry/i.test(url))
        candidate={url,kind:'Other',detail:'Unclassified download/data link',fileName:new URL(url).pathname.split('/').pop().slice(0,240),label:String(item.label || '').slice(0,180),origin:item.origin || 'page'};
    }
    if (!candidate || seen.has(candidate.url)) continue;
    seen.add(candidate.url); result.push(candidate);
    if (result.length === 150) break;
  }
  return result;
}

export function displayUrl(value) {
  const url = new URL(value);
  // Query values often contain signed access tokens. Keep them out of the review UI.
  const path = url.pathname.replace(/(\/api\/eq\/redirect\/).+/, '$1[encoded destination]');
  return `${url.origin}${path}${url.search ? '?[parameters hidden]' : ''}`;
}

export function displayLabel(value) {
  return String(value).replace(/https?:\/\/[^\s<>]+/g, url => {
    try { return displayUrl(url); } catch { return '[link]'; }
  });
}

export function readSyncPoints(data) {
  if (!Array.isArray(data) || data.length < 2 || data.length > 4096) throw new Error('Expected a Soundslice array with 2–4096 points.');
  let previousBar = -1, previousPosition = -1, previousTime = -1;
  return data.map(point => {
    if (!Array.isArray(point) || point.length < 2 || point.length > 4) throw new Error('Unrecognized timing point.');
    const [bar, seconds, position = 0, hide = 0] = point;
    if (!Number.isInteger(bar) || bar < 0 || !Number.isFinite(seconds) || seconds < 0 || seconds > 86400 ||
        !Number.isFinite(position) || position < 0 || position > 480 || ![0, 1].includes(hide) ||
        seconds <= previousTime || bar < previousBar || (bar === previousBar && position <= previousPosition)) {
      throw new Error('Timing positions and seconds must increase and use valid Soundslice values.');
    }
    if (previousBar === -1 && (bar !== 0 || position !== 0)) throw new Error('The first point must start at playback bar 0.');
    previousBar = bar; previousPosition = position; previousTime = seconds;
    return {bar, seconds, position, hide};
  });
}
