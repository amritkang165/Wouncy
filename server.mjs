import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
const root = resolve('dist');
const types = { '.html':'text/html', '.css':'text/css', '.js':'text/javascript', '.webp':'image/webp', '.ttf':'font/ttf', '.svg':'image/svg+xml' };
http.createServer(async (req,res) => {
  const path = resolve(root, '.' + decodeURIComponent(new URL(req.url,'http://localhost').pathname));
  if (path !== root && !path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
  try {
    const file = path === root ? resolve(root,'index.html') : path;
    const bytes = await readFile(file);
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-cache'}).end(bytes);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(Number(process.env.PORT || 4173),'127.0.0.1',() => console.log('Local: http://localhost:'+(process.env.PORT || 4173)));
