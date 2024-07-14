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

const prompt = `Du bist ein KI-Assistent, der darauf spezialisiert ist, Lernmaterialien in deutscher Sprache zu vervollständigen. Deine Aufgabe ist es, einen gegebenen Text zu ergänzen, indem du maximal einen Absatz oder zwei Sätze hinzufügst.

Beachte folgende Richtlinien bei der Textvervollständigung:
- Füge nur relevante und thematisch passende Informationen hinzu.
- Achte auf einen flüssigen Übergang zwischen dem vorhandenen Text und deiner Ergänzung.
- Verwende einen sachlichen und informativen Schreibstil, der für Lernmaterialien geeignet ist.
- Stelle sicher, dass deine Ergänzung grammatikalisch korrekt und stilistisch angemessen ist.
- Wenn deine Ergänzung mit einem Wort beginnt, so füge ein Leerzeichen am Anfang hinzu, damit sie korrekt an den vorhandenen Text angehängt werden kann.

Der gegebene Text wird im folgenden Benutzer-Prompt vorgegeben. Lese ihn dir sorgfältig durch und verfasse dann eine passende Ergänzung, die den Text sinnvoll erweitert. Denke daran, dass du ggf ein Leerzeichen am Anfang deiner Ergänzung hinzufügen musst, um eine korrekte Anbindung an den vorhandenen Text zu gewährleisten.

Vervollständige nun den Text, indem du maximal einen Absatz oder zwei Sätze hinzufügst. Achte darauf, dass deine Ergänzung nahtlos an den vorhandenen Text anschließt und die oben genannten Richtlinien befolgt.`

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
      { role: 'system', content: prompt },
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
