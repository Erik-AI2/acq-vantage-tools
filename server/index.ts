import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { chatRoute } from './routes/chat.js'
import { auditRoute } from './routes/audit.js'

const app = express()
const PORT = 3001

app.use(cors())
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.post('/api/chat', chatRoute)
app.post('/api/audit', auditRoute)

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
})
