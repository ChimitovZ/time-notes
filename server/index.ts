import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'

import { improveTextWithAi } from './ai'
import { db } from './db'

type NoteRow = {
  id: number
  text: string
  created_at: string
}

const app = Fastify({ logger: true })
const port = Number(process.env.PORT ?? 3001)

await app.register(cors, { origin: true })

const createNoteSchema = z.object({
  text: z.string().trim().min(1).max(4000),
})
const updateNoteSchema = createNoteSchema
const listNotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
})
const noteParamsSchema = z.object({
  id: z.coerce.number().int().min(1),
})
const improveTextSchema = z.object({
  text: z.string().trim().min(1).max(4000),
})

app.get('/api/health', async () => ({ ok: true }))

app.get('/api/notes', async (request, reply) => {
  const parsedQuery = listNotesQuerySchema.safeParse(request.query)

  if (!parsedQuery.success) {
    return reply.code(400).send({
      message: 'Некорректные параметры пагинации',
      issues: parsedQuery.error.issues,
    })
  }

  const { limit, offset } = parsedQuery.data
  const rows = db
    .prepare(
      'SELECT id, text, created_at FROM notes ORDER BY datetime(created_at) DESC, id DESC LIMIT ? OFFSET ?',
    )
    .all(limit, offset) as NoteRow[]
  const total = db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number }

  return {
    items: rows.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
    })),
    total: total.count,
    limit,
    offset,
  }
})

app.post('/api/notes', async (request, reply) => {
  const parsed = createNoteSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      message: 'Некорректный текст заметки',
      issues: parsed.error.issues,
    })
  }

  const now = new Date().toISOString()
  const result = db
    .prepare('INSERT INTO notes (text, created_at) VALUES (?, ?)')
    .run(parsed.data.text, now)

  return reply.code(201).send({
    id: Number(result.lastInsertRowid),
    text: parsed.data.text,
    createdAt: now,
  })
})

app.post('/api/ai/improve', async (request, reply) => {
  const parsed = improveTextSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      message: 'Некорректный текст для улучшения',
      issues: parsed.error.issues,
    })
  }

  const improvedText = await improveTextWithAi(parsed.data.text)
  return { text: improvedText }
})

app.patch('/api/notes/:id', async (request, reply) => {
  const parsedParams = noteParamsSchema.safeParse(request.params)
  const parsedBody = updateNoteSchema.safeParse(request.body)

  if (!parsedParams.success || !parsedBody.success) {
    return reply.code(400).send({
      message: 'Некорректные данные для обновления заметки',
      issues: [...(parsedParams.error?.issues ?? []), ...(parsedBody.error?.issues ?? [])],
    })
  }

  const result = db
    .prepare('UPDATE notes SET text = ? WHERE id = ?')
    .run(parsedBody.data.text, parsedParams.data.id)

  if (result.changes === 0) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const row = db.prepare('SELECT id, text, created_at FROM notes WHERE id = ?').get(parsedParams.data.id) as
    | NoteRow
    | undefined

  if (!row) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  return {
    id: row.id,
    text: row.text,
    createdAt: row.created_at,
  }
})

app.delete('/api/notes/:id', async (request, reply) => {
  const parsedParams = noteParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор заметки',
      issues: parsedParams.error.issues,
    })
  }

  const result = db.prepare('DELETE FROM notes WHERE id = ?').run(parsedParams.data.id)

  if (result.changes === 0) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  return reply.code(204).send()
})

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error)
  return reply.code(500).send({ message: 'Внутренняя ошибка сервера' })
})

app.listen({ port, host: '0.0.0.0' }).catch((error) => {
  app.log.error(error)
  process.exit(1)
})
