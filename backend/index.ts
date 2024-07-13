import esbuild from 'esbuild'
import express from 'express'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const projectDir = dirname(dirname(__filename))
const app = express()

app.get('/', (_, res) => {
  res.sendFile(join(projectDir, 'public', 'index.html'))
})

app.get('/index.js', async (_, res) => {
  res.setHeader('Content-Type', 'application/javascript')

  try {
    const result = await esbuild.build({
      entryPoints: [join(projectDir, 'frontend', 'index.tsx')],
      bundle: true,
      format: 'esm',
      platform: 'browser',
      write: false,
    })

    res.setHeader('Content-Type', 'application/javascript')
    res.send(result.outputFiles[0].text)
  } catch (error) {
    console.error('Error bundling TypeScript:', error)
    res.status(500).send('Error bundling TypeScript')
  }
})

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
