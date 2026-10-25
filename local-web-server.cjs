// Optional ZIP launcher server. The hosted app and Live Server do not use this.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const {spawn} = require('node:child_process');
const readline = require('node:readline');

const ROOT = __dirname;
const ALLOWED = new Set(['index.html', 'README.html', 'README.md', 'LICENSE', 'style.css',
  'menu-controls.css', 'media-sync.css', 'workspace-panels.css', 'guide.css', 'lesson-import.css',
  'site.webmanifest', 'version.json', 'assets', 'js', 'docs']);
const TYPES = {'':'text/plain; charset=utf-8', '.txt':'text/plain; charset=utf-8', '.html':'text/html; charset=utf-8', '.md':'text/plain; charset=utf-8',
  '.js':'text/javascript; charset=utf-8', '.mjs':'text/javascript; charset=utf-8',
  '.css':'text/css; charset=utf-8', '.json':'application/json', '.webmanifest':'application/manifest+json',
  '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon',
  '.woff':'font/woff', '.woff2':'font/woff2', '.otf':'font/otf', '.ttf':'font/ttf',
  '.xml':'application/xml', '.musicxml':'application/xml', '.wasm':'application/wasm',
  '.mp3':'audio/mpeg', '.wav':'audio/wav', '.ogg':'audio/ogg'};

function within(root, target) {
  const relative = path.relative(root, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}

function createAppServer(root = ROOT) {
  return http.createServer(async (req, res) => {
    const send = (status, body, type = 'text/plain; charset=utf-8') => {
      res.writeHead(status, {'Content-Type':type, 'X-Content-Type-Options':'nosniff', 'Cache-Control':'no-cache'});
      res.end(req.method === 'HEAD' ? undefined : body);
    };
    if (!['GET', 'HEAD'].includes(req.method)) return send(405, 'Use GET or HEAD.');
    let pathname;
    try { pathname = decodeURIComponent((req.url || '/').split('?')[0]); }
    catch { return send(400, 'Invalid URL.'); }
    pathname = pathname.replace(/\\/g, '/');
    if (pathname.includes('\0')) return send(400, 'Invalid URL.');
    if (pathname === '/') pathname = '/index.html';
    const relative = pathname.replace(/^\/+/, '');
    if (!ALLOWED.has(relative.split('/')[0])) return send(404, 'Not found.');
    const target = path.resolve(root, relative);
    if (!within(root, target) || !ALLOWED.has(path.relative(root, target).split(path.sep)[0])) return send(404, 'Not found.');
    try {
      const [realRoot, realTarget] = await Promise.all([fs.realpath(root), fs.realpath(target)]);
      if (!within(realRoot, realTarget) || !ALLOWED.has(path.relative(realRoot, realTarget).split(path.sep)[0])) return send(404, 'Not found.');
      const data = await fs.readFile(realTarget);
      send(200, data, TYPES[path.extname(target).toLowerCase()] || 'application/octet-stream');
    } catch { send(404, 'Not found.'); }
  });
}

function openBrowser(url) {
  const command = process.platform === 'win32' ? 'powershell.exe' : 'open';
  const args = process.platform === 'win32'
    ? ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', `Start-Process '${url}'`] : [url];
  const child = spawn(command, args, {stdio:'ignore', windowsHide:true});
  child.on('error', () => console.log(`Open this address in your browser: ${url}`));
}

function copyAddress(url, start = spawn) {
  // Native clipboard tools; no shell interpolation and no browser permissions.
  return new Promise(resolve => {
    const command = process.platform === 'win32' ? 'clip.exe' : 'pbcopy';
    const child = start(command, [], {stdio:['pipe', 'ignore', 'ignore'], windowsHide:true});
    child.on('error', () => resolve(false));
    child.on('close', code => resolve(code === 0));
    child.stdin.on('error', () => resolve(false));
    child.stdin.end(url);
  });
}

if (require.main === module) {
  if (Number(process.versions.node.split('.')[0]) < 22) {
    console.error('Please install Node.js 22 or newer from https://nodejs.org/');
    process.exitCode = 1;
  } else {
    const port = Number(process.env.GTS_PORT || 8081);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
      console.error('GTS_PORT must be a port number from 1 to 65535.');
      process.exitCode = 1;
    } else {
      const server = createAppServer();
      server.on('error', error => {
        console.error(error.code === 'EADDRINUSE'
          ? `Port ${port} is already in use. Close the other launcher or choose another GTS_PORT.`
          : `Could not start Guitar Trainer: ${error.message}`);
        process.exitCode = 1;
      });
      server.listen(port, '127.0.0.1', () => {
        const url = `http://127.0.0.1:${port}/`;
        console.log(`Guitar Trainer Studio: ${url}\nKeep this window open while practicing. Press Ctrl+C to stop.\nUse a Web MIDI browser such as Chrome for guitar input.`);
        if (process.stdin.isTTY) {
          console.log('Press C then Enter to copy the local address for another browser.');
          const input = readline.createInterface({input:process.stdin, output:process.stdout});
          input.on('line', async line => {
            if (line.trim().toLowerCase() !== 'c') return;
            console.log(await copyAddress(url) ? `Copied: ${url}` : `Could not copy automatically. Select and copy this address: ${url}`);
          });
          server.on('close', () => input.close());
        }
        if (process.argv.includes('--open')) openBrowser(url);
      });
    }
  }
}

module.exports = {createAppServer, copyAddress};
