const http = require('node:http')
const fs = require('node:fs/promises')
const path = require('node:path')
const root = __dirname
const fonts = path.resolve(root, '../../src/static/fronts')
const fontRoutes = { '/fonts/seal.ttf': '方正小篆体.ttf', '/fonts/modern.ttf': '优设标题黑.ttf' }
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json', '.ttf': 'font/ttf', '.png': 'image/png', '.jpg': 'image/jpeg' }
http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost')
    const name = decodeURIComponent(url.pathname)
    const font = fontRoutes[name]
    const file = font ? path.join(fonts, font) : path.resolve(root, '.' + (name === '/' ? '/index.html' : name))
    if (!font && !file.startsWith(root + path.sep)) { response.writeHead(403).end(); return }
    const content = await fs.readFile(file)
    response.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' }).end(content)
  } catch (error) {
    if (error.code !== 'ENOENT') console.error('Preview server:', error.message)
    response.writeHead(404).end('Not found')
  }
}).listen(18635, '127.0.0.1', () => console.log('Study designs: http://127.0.0.1:18635/'))
