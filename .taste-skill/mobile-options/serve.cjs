const http = require('node:http')
const fs = require('node:fs/promises')
const path = require('node:path')
const root = __dirname
const font = path.resolve(__dirname, '../../src/static/fronts/汉仪楷体繁.ttf')
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' }
const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    const pathname = decodeURIComponent(url.pathname)
    const file = pathname === '/fonts/kai.ttf' ? font : path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (file !== font && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return }
    const content = await fs.readFile(file)
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(content)
  } catch { response.writeHead(404).end('Not found') }
})
server.listen(18624, '127.0.0.1', () => process.stdout.write('Mobile options: http://127.0.0.1:18624\n'))
process.on('SIGTERM', () => server.close(() => process.exit(0)))
