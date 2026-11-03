import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import path from 'node:path'
import type { Plugin } from 'vite'
import { buildCatalogSeed } from './catalogSeed'
import type { StudyCharacterEntry } from '../src/study/types'

export function catalogPlugin(): Plugin {
  let isBuild = false
  let generated: Promise<{ version: string; source: string }> | undefined
  const files = ['src/data/character-table/first-level.json', ...Array.from({ length: 13 }, (_, index) => `src/data/character-table/firstLevel/${index + 1}.json`), 'src/data/character-table/first-level-supplement.json', 'src/data/character-table/second-level.json', 'src/data/character-table/third-level.json']
  function generate() {
    generated ??= Promise.all(files.map(async (file) => JSON.parse(await readFile(path.resolve(file), 'utf8')) as { chars: StudyCharacterEntry[] })).then(([daily, ...shards]) => {
      const changes = buildCatalogSeed(daily!.chars, shards.slice(0,-2).map(source=>source.chars), shards.slice(-2).map(source=>source.chars))
      const version = createHash('sha256').update(JSON.stringify(changes)).digest('hex')
      return { version, source: JSON.stringify({ version, changes }) }
    })
    return generated
  }
  return {
    name: 'local-database-catalog',
    configResolved(config) { isBuild = config.command === 'build' },
    async buildStart() {
      for (const file of files) this.addWatchFile(path.resolve(file))
      generated = undefined
      const data = await generate()
      if (!isBuild) return
      this.emitFile({ type: 'asset', fileName: 'static/database/catalog-version.txt', source: data.version })
      this.emitFile({ type: 'asset', fileName: 'static/database/catalog-seed.json', source: data.source })
    },
    configureServer(server) {
      server.watcher.on('change', (file) => { if (files.some((source) => path.resolve(source) === file)) generated = undefined })
      server.middlewares.use(async (request, response, next) => {
        const url = request.url?.split('?')[0]
        if (url !== '/static/database/catalog-seed.json' && url !== '/static/database/catalog-version.txt') { next(); return }
        try {
          const data = await generate()
          response.setHeader('Content-Type', url.endsWith('.json') ? 'application/json; charset=utf-8' : 'text/plain')
          response.end(url.endsWith('.json') ? data.source : data.version)
        } catch (error) { next(error) }
      })
    },
  }
}
