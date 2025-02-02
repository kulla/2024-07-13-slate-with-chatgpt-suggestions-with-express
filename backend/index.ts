import esbuild from 'esbuild'
import express from 'express'
import * as t from 'io-ts'
import { OpenAI } from 'openai'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const buildID = `build-${new Date().getTime()}-${Math.random()}`
const __filename = fileURLToPath(import.meta.url)
const projectDir = dirname(dirname(__filename))
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
const app = express()
const Completion = t.type({
  completion: t.string,
  newWord: t.boolean,
})

const prompt = `Du bist ein KI-Assistent, der darauf spezialisiert ist, Lernmaterialien in deutscher Sprache zu vervollständigen. Deine Aufgabe ist es, einen gegebenen Text zu ergänzen, indem du maximal einen Absatz oder zwei Sätze hinzufügst.

Beachte folgende Richtlinien bei der Textvervollständigung:
- Füge nur relevante und thematisch passende Informationen hinzu.
- Achte auf einen flüssigen Übergang zwischen dem vorhandenen Text und deiner Ergänzung.
- Verwende einen sachlichen und informativen Schreibstil, der für Lernmaterialien geeignet ist.
- Stelle sicher, dass deine Ergänzung grammatikalisch korrekt und stilistisch angemessen ist.
- Wenn deine Ergänzung mit einem Wort beginnt, so füge ein Leerzeichen am Anfang hinzu, damit sie korrekt an den vorhandenen Text angehängt werden kann.

Der gegebene Text wird im folgenden Benutzer-Prompt vorgegeben. Dieser hat das folgende Format:

<text>
{{TEXT}}
</text>

Vervollständige nun den Text, indem du maximal einen Absatz oder zwei Sätze hinzufügst. Achte darauf, dass deine Ergänzung nahtlos an den vorhandenen Text anschließt und die oben genannten Richtlinien befolgt.

Deine Antwort soll im JSON-Format erfolgen und folgende Felder enthalten:
- "completion": Der Text, den du zur Vervollständigung hinzufügst (maximal ein Absatz oder zwei Sätze).
- "newWord": Ein boolescher Wert (true/false), der angibt, ob die Ergänzung mit einem eigenen Absatz beginnt (true) oder direkt an den bestehenden Text anschließt (false).

Analysiere den gegebenen Text sorgfältig und erstelle dann eine passende Ergänzung. Gib deine Antwort im spezifizierten JSON-Format aus, ohne zusätzliche Erklärungen oder Kommentare.`

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

  try {
    if (typeof suffix !== 'string' || suffix.length === 0) {
      res.status(400).json({ error: 'Invalid context' })
      return
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: `<text>${suffix}</text>` },
      ],
      temperature: 0.25,
      response_format: { type: 'json_object' },
    })
    console.log(response)
    const { choices } = response

    if (choices.length === 0 || choices[0].message.content === null) {
      res.status(500).json({ error: 'No completions found' })
      return
    }

    const completion = JSON.parse(choices[0].message.content) as unknown

    if (!Completion.is(completion)) {
      res.status(500).json({ error: 'Invalid completion' })
      return
    }

    const suggestion = (completion.newWord ? ' ' : '') + completion.completion

    res.json({
      suggestion,
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
    })
  } catch (error) {
    console.error('Error fetching suggestion:', error)
    res.status(500).json({ error: 'Failed to fetch suggestion' })
  }
})

app.get('/___build_id', (_, res) => {
  res.send(buildID)
})

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
