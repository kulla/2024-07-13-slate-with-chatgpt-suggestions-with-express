import esbuild from 'esbuild'
import express from 'express'
import { OpenAI } from 'openai'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const buildID = `build-${new Date().getTime()}-${Math.random()}`
const __filename = fileURLToPath(import.meta.url)
const projectDir = dirname(dirname(__filename))
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const app = express()

app.get('/', (_, res) => {
  res.sendFile(join(projectDir, 'public', 'index.html'))
})

app.get('/favicon.ico', (_, res) => {
  res.sendFile(join(projectDir, 'public', 'favicon.ico'))
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
      minify: true,
    })

    res.setHeader('Content-Type', 'application/javascript')
    res.send(result.outputFiles[0].text)
  } catch (error) {
    console.error('Error bundling TypeScript:', error)
    res.status(500).send('Error bundling TypeScript')
  }
})

app.get('/api/complete', async (req, res) => {
  const suffix = req.query.context

  if (typeof suffix !== 'string' || suffix.length === 0) {
    res.status(400).json({ error: 'Invalid context' })
    return
  }

  const { choices } = await openai.completions.create({
    suffix,
    model: 'gpt-3.5-turbo-instruct',
    prompt:
      'Du bist ein Lehrer und schreibst ein Lehrmaterial. Vervollständige den Satz.',
  })

  if (choices.length === 0) {
    res.status(500).json({ error: 'No completions found' })
    return
  }

  const suggestion = choices[0].text.trim()

  if (suggestion.length === 0) {
    res.status(500).json({ error: 'Empty completion' })
    return
  }

  res.json({ suggestion })
})

app.get('/___build_id', (_, res) => {
  res.send(buildID)
})

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
