import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import packageJson from './package.json'
import {
  BUILD_METADATA_FILE_NAME,
  createBuildMetadata,
  serializeBuildMetadata,
} from './scripts/buildMetadata'

const buildMetadata = createBuildMetadata(packageJson.version)
const buildMetadataJson = serializeBuildMetadata(buildMetadata)

const normalizeBasePath = (base: string): string => {
  const withLeadingSlash = base.startsWith('/') ? base : `/${base}`
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`
}

const buildMetadataPlugin = () => ({
  name: 'build-metadata',
  configureServer(server) {
    const buildMetadataPath = `${normalizeBasePath(server.config.base)}${BUILD_METADATA_FILE_NAME}`

    server.middlewares.use((request, response, next) => {
      const requestPath = request.url?.split('?')[0]

      if (requestPath !== buildMetadataPath) {
        next()
        return
      }

      response.statusCode = 200
      response.setHeader('Content-Type', 'application/json; charset=utf-8')
      response.setHeader('Cache-Control', 'no-store')
      response.end(buildMetadataJson)
    })
  },
  generateBundle() {
    this.emitFile({
      type: 'asset',
      fileName: BUILD_METADATA_FILE_NAME,
      source: buildMetadataJson,
    })
  },
})

export default defineConfig({
  base: '/charmap2/',
  define: {
    __APP_BUILD_ID__: JSON.stringify(buildMetadata.buildId),
    __APP_VERSION__: JSON.stringify(packageJson.version),
  },
  plugins: [react(), buildMetadataPlugin()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
    setupFiles: ['src/test/setup.ts'],
  },
})
