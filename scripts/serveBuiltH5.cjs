const http = require('node:http')
const fs = require('node:fs/promises')
const path = require('node:path')

const root = path.resolve(__dirname, '../dist/build/h5')
const port = Number(process.argv[2] || 18613)
const contentTypes = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ttf': 'font/ttf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.pdf': 'application/pdf' }
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
    const file = path.resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname))
    if (!file.startsWith(root + path.sep)) { response.writeHead(403).end(); return }
    const data = await fs.readFile(file)
    response.writeHead(200, { 'Content-Type': contentTypes[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    response.end(data)
  } catch { response.writeHead(404).end('Not found') }
})
server.listen(port, '127.0.0.1', () => process.stdout.write(`Built H5: http://127.0.0.1:${port}\n`))
process.on('SIGTERM', () => server.close(() => process.exit(0)))
