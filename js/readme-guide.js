// Renders only the trusted, repository-owned README. Never accepts uploaded Markdown.
(async () => {
  const content = document.getElementById('guide-content');
  try {
    const response = await fetch('./README.md');
    if (!response.ok) throw new Error('Guide unavailable');
    const renderer = new marked.Renderer();
    const used = new Map();
    renderer.heading = function ({tokens, depth, text}) {
      const base = text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
      const count = used.get(base) || 0;
      used.set(base, count + 1);
      return `<h${depth} id="${base}${count ? `-${count}` : ''}">${this.parser.parseInline(tokens)}</h${depth}>\n`;
    };
    content.innerHTML = marked.parse(await response.text(), {renderer});
    if (location.hash) document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView();
  } catch {
    content.replaceChildren();
    const message = document.createElement('p');
    message.textContent = 'The guide could not load. Open it from the hosted app, a local launcher, or Live Server. You can also read README.md in the downloaded folder.';
    content.append(message);
  } finally { content.setAttribute('aria-busy', 'false'); }
})();
