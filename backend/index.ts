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

const prompt = `Du bist ein erfahrener Autor von Lernmaterialien in deutscher Sprache. Deine Aufgabe ist es, einen unvollständigen Text zu vervollständigen, indem du maximal einen Absatz hinzufügst. Der Text soll informativ, klar und für Lernende leicht verständlich sein.

Der Text wird dir im nachfolgenden user prompt vorgegeben.

Bitte vervollständige den Text unter Berücksichtigung der folgenden Anweisungen:

1. Füge maximal einen Absatz hinzu, um den Text sinnvoll zu ergänzen.
2. Stelle sicher, dass die Ergänzung nahtlos an den bestehenden Text anknüpft.
3. Verwende eine klare, präzise und leicht verständliche Sprache.
4. Achte darauf, dass die Informationen sachlich korrekt und relevant für das angegebene Thema sind.
5. Behalte den Schreibstil und Ton des ursprünglichen Textes bei.
6. Vermeide umgangssprachliche Ausdrücke oder komplizierte Fachbegriffe, es sei denn, sie sind für das Thema unerlässlich.
7. Vervollständige maximal zwei Sätze.

Achte darauf, dass deine Ergänzung den Text sinnvoll abschließt und keine offenen Fragen hinterlässt.`

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

  const { choices } = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [
      {
        role: 'system',
        content: prompt,
      },
      { role: 'user', content: suffix },
    ],
  })

  if (choices.length === 0 || choices[0].message.content === null) {
    res.status(500).json({ error: 'No completions found' })
    return
  }

  const suggestion = choices[0].message.content

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
