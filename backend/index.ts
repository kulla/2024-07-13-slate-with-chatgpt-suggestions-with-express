import express from 'express'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const projectDir = dirname(dirname(__filename))
const app = express()

app.get('/', (_, res) => {
  res.sendFile(join(projectDir, 'public', 'index.html'))
})

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000')
})
