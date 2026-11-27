// SMuFL code points for common printed noteheads, clefs and rests.
const notehead = /^[\uE0A2-\uE0A4]$/u;
const noteheadRun = /^[\uE0A2-\uE0A4](?: +[\uE0A2-\uE0A4])+$/u;
const clef = /^[\uE050\uE05C\uE062]$/u;
const rest = /^[\uE4E3-\uE4EB]$/u;

export async function readBeatGlyphs(page, viewport) {
  if (viewport.rotation !== 0) return [];
  const {items} = await page.getTextContent({disableNormalization: true});
  if (!items.length) return null;
  const glyphs = [];
  for (const item of items) {
    const text = item.str?.trim();
    const grouped = noteheadRun.test(text);
    if (!grouped && !notehead.test(text) && !clef.test(text) && !rest.test(text)) continue;
    const [, skewY, skewX, , left, baseline] = item.transform;
    if (skewX || skewY || !(item.width > 0)) continue;
    // A PDF text run gives one origin and one total width. Use it only
    // as evidence of later notes, since individual centers are unavailable.
    const [x, y] = viewport.convertToViewportPoint(grouped ? left : left + item.width / 2, baseline);
    glyphs.push({x: x / viewport.width, y: y / viewport.height, text, grouped});
  }
  return glyphs.sort((a, b) => a.x - b.x);
}

export function beatInset(box, glyphs) {
  const row = glyphs.filter(({x, y}) =>
    x >= box.x && x < box.x + box.w && y >= box.y && y <= box.y + box.h);
  const first = row.find(({text}) => notehead.test(text));
  if (!first) return 0;
  const inset = (first.x - box.x) / box.w;
  if (inset < 0.08 || inset > 0.55) return 0;
  const hasClef = row.some(({x, text}) => x < first.x && clef.test(text));
  const hasPriorRest = row.some(({x, text}) => x < first.x && rest.test(text));
  const hasPriorRun = row.some(({x, grouped}) => x <= first.x && grouped);
  const hasLaterNote = row.some(({x, text, grouped}) =>
    x > first.x + box.w * 0.025 && (grouped || notehead.test(text)));
  return hasClef && !hasPriorRest && !hasPriorRun && hasLaterNote ? inset : 0;
}

// Image-only pages have no glyph positions. Find filled noteheads at stem
// tips in the first bar of a five-line staff, with later heads as corroboration.
export function rasterBeatAnchors(pixels,width,height,staves,boxes) {
  const anchors=[];
  const dark=(x,y)=>x>=0 && x<width && y>=0 && y<height && pixels[y*width+x]<160;
  for(const staff of staves){
    const {left,top,bottom,gap}=staff;
    if(staff.lines!==5 || gap<5)continue;
    const box=boxes.find(b=>Math.abs(b.x*width-left)<gap*1.5 &&
      top>=b.y*height && bottom<=(b.y+b.h)*height);
    if(!box)continue;
    const heads=[];
    const limit=Math.min((box.x+box.w)*width,left+gap*24);
    for(let x=Math.round(left+gap*6);x<limit;x++){
      for(const dir of [-1,1]){
        for(let y=Math.round(top-gap);y<=bottom+gap;y++){
          // The stem approaches the head on the opposite side of its tip.
          if(!dark(x,y) || dark(x,y-dir) || !dark(x,y+Math.round(dir*gap*2)))continue;
          let stem=0;
          for(let i=1;i<=Math.round(gap*2);i++)if(dark(x,y+i*dir))stem++;
          if(stem<gap*1.8)continue;
          const headY=y+dir*gap*.38, headX=x+dir*gap*.48;
          let filled=0,rows=0;
          for(let dy=-.22*gap;dy<=.22*gap;dy++){
            const row=Math.round(headY+dy);
            if(Math.abs((row-top)/gap-Math.round((row-top)/gap))<.15)continue;
            rows++;
            if(dark(Math.round(headX-gap*.22),row) && dark(Math.round(headX+gap*.22),row))filled++;
          }
          if(rows<2 || filled<Math.max(2,rows*.66) || heads.some(h=>Math.abs(h-headX)<gap*.85))continue;
          heads.push(headX);
        }
      }
    }
    heads.sort((a,b)=>a-b);
    const first=heads[0];
    if(heads.length<3 || first>left+(limit-left)*.7)continue;
    anchors.push({left:left/width,y:(top+bottom)/2/height,x:first/width,tolerance:gap*1.5/width});
  }
  return anchors;
}

export function rasterBeatInset(box,anchors) {
  const anchor=anchors.find(a=>Math.abs(a.left-box.x)<a.tolerance &&
    a.y>=box.y && a.y<box.y+box.h && a.x>box.x && a.x<box.x+box.w*.55);
  return anchor ? (anchor.x-box.x)/box.w : 0;
}
