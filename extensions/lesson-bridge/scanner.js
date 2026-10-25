// SPDX-License-Identifier: AGPL-3.0-or-later
// This function is serialized by chrome.scripting. Keep it self-contained.
export async function scanPage() {
  const raw = [], notices = [], documents = [], visited = new Set();
  const add = (url, label, origin, base) => {
    if (typeof url !== 'string' || url.length > 12000 || raw.length >= 2500) return;
    try {
      const parsed = new URL(url.replace(/\\\//g, '/').replace(/&amp;/g, '&'), base);
      if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password)
        raw.push({url:parsed.href, label:String(label || '').slice(0,180), origin});
    } catch { /* Ignore non-URL page content. */ }
  };
  const inspect = (doc, depth = 0) => {
    if (!doc || visited.has(doc) || depth > 4 || documents.length >= 12) return;
    visited.add(doc); documents.push(doc);
    const base = doc.baseURI;
    for (const node of [...doc.querySelectorAll('a[href],video,audio,source,iframe')].slice(0,1500)) {
      const tag = node.tagName.toLowerCase();
      add(node.getAttribute('href') || node.currentSrc || node.getAttribute('src'), node.textContent || node.title, tag, base);
      if (tag === 'iframe') {
        try {
          if (node.contentDocument) inspect(node.contentDocument, depth + 1);
          else notices.push('A cross-origin player frame could not be read. Its visible URL was inspected.');
        } catch { notices.push('A cross-origin player frame could not be read.'); }
      }
    }
    // Existing resource names are observations, not a persistent network listener.
    for (const entry of doc.defaultView.performance.getEntriesByType('resource').slice(-1000)) add(entry.name, '', 'loaded resource', base);
    let remaining = 1500000;
    for (const script of [...doc.scripts].slice(0,100)) {
      const text = script.textContent.slice(0, Math.min(remaining, 250000)); remaining -= text.length;
      if (remaining <= 0) break;
      // Read quoted URL declarations only. Never evaluate page JavaScript or return scripts.
      for (const match of text.matchAll(/["']((?:https?:\/\/|https?:\\\/\\\/|\/)[^"'\s<>]{1,12000})["']/g)) add(match[1], '', 'page declaration', base);
    }
  };
  inspect(document);
  const isTrueFire = location.hostname === 'truefire.com' || location.hostname.endsWith('.truefire.com');
  const pageVideoId=location.pathname.match(/\/v(\d+)/)?.[1];
  // Channels/Methods /l IDs are navigation IDs, not the player lesson ID.
  const channelPage=/\/channels\//.test(location.pathname);
  const playerIds=raw.filter(item=>item.origin==='iframe').map(item=>{
    const url=new URL(item.url),q=url.searchParams;
    if(url.origin!==location.origin || !/soundsliceappshell/i.test(url.pathname))return null;
    const cid=q.get('cid') || q.get('courseid') || q.get('course_id');
    const sid=q.get('sid') || q.get('lessonid') || q.get('videoid') || q.get('video_id') || pageVideoId;
    return /^\d+$/.test(cid || '') && /^\d+$/.test(sid || '') && (!pageVideoId || sid===pageVideoId)?{cid,sid}:null;
  }).find(Boolean);
  const lessonId=playerIds?.sid || pageVideoId;
  if (isTrueFire) {
    // Prefer an actually observed manifest. Otherwise use IDs exposed in a player URL.
    let manifest = raw.find(item => {
      const u = new URL(item.url);
      return u.origin === location.origin && u.pathname === '/api/eq/nexus/courses/soundslice_manifest' &&
        (!lessonId || u.searchParams.get('sid')===lessonId) && (!playerIds || u.searchParams.get('cid')===playerIds.cid) &&
        (!channelPage || Boolean(playerIds)) && /^\d+$/.test(u.searchParams.get('cid') || '');
    })?.url;
    if (!manifest) {
      if(playerIds)manifest=`${location.origin}/api/eq/nexus/courses/soundslice_manifest?cid=${playerIds.cid}&sid=${playerIds.sid}`;
    }
    if (manifest) {
      add(manifest, '', 'TrueFire player', location.href);
      try {
        const response = await fetch(manifest, {credentials:'same-origin', signal:AbortSignal.timeout(8000)});
        if (!response.ok) throw new Error();
        const text = await response.text();
        if (text.length > 1000000) throw new Error();
        const payload = JSON.parse(text);
        let count = 0;
        const walk = (value, key = '', depth = 0) => {
          if (++count > 5000 || depth > 12) return;
          if (typeof value === 'string') add(value, key, 'TrueFire manifest', response.url);
          else if (value && typeof value === 'object') for (const [k,v] of Object.entries(value)) walk(v, k, depth+1);
        };
        walk(payload);
        notices.push('Read the TrueFire player manifest. Candidates still need checking against the score.');
      } catch { notices.push('The TrueFire manifest could not be read as JSON. Sign in, load the player and scan again.'); }
    } else notices.push('No readable TrueFire manifest URL or player IDs were found. Load the lesson player and scan again.');
  }
  const filtered=raw.filter(item=>{
    const url=new URL(item.url),match=url.pathname.match(/\/soundslice\/slices\/\d+\/(\d+)_sync\.json$/);
    if(isTrueFire && lessonId && url.origin===location.origin && url.pathname==='/api/eq/nexus/courses/soundslice_manifest' && url.searchParams.get('sid')!==lessonId)return false;
    return !(isTrueFire && lessonId && match && match[1]!==lessonId);
  });
  if(isTrueFire && playerIds)notices.push(`Player identified: course ${playerIds.cid}, lesson ${playerIds.sid}${channelPage?' (Methods/Channels)':''}.`);
  return {title:document.title.slice(0,240), page:location.origin + location.pathname, raw:filtered,
    notices:[...new Set(notices)], frames:documents.length};
}
