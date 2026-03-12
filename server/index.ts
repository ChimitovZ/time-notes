import Fastify from 'fastify'
import cors from '@fastify/cors'
import { z } from 'zod'

import { improveTextWithAi } from './ai'
import { db } from './db'

type NoteRow = {
  id: number
  text: string
  created_at: string
  version: number
}
type GroupRow = {
  id: number
  name: string
  created_at: string
  note_count: number
}
type NoteVersionRow = {
  version: number
  text: string
  created_at: string
}
type NoteCommentRow = {
  id: number
  note_id: number
  text: string
  created_at: string
  updated_at: string
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
  groupId: z.coerce.number().int().min(1).optional(),
})
const noteParamsSchema = z.object({
  id: z.coerce.number().int().min(1),
})
const noteVersionParamsSchema = z.object({
  id: z.coerce.number().int().min(1),
  version: z.coerce.number().int().min(1),
})
const commentParamsSchema = z.object({
  commentId: z.coerce.number().int().min(1),
})
const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(120),
  noteIds: z.array(z.coerce.number().int().min(1)).min(1),
})
const improveTextSchema = z.object({
  text: z.string().trim().min(1).max(4000),
})
const createCommentSchema = z.object({
  text: z.string().trim().min(1).max(2000),
})

function mapComment(row: NoteCommentRow) {
  return {
    id: row.id,
    noteId: row.note_id,
    text: row.text,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

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
  const rows =
    parsedQuery.data.groupId === undefined
      ? (db
          .prepare(
            'SELECT id, text, created_at, version FROM notes ORDER BY datetime(created_at) DESC, id DESC LIMIT ? OFFSET ?',
          )
          .all(limit, offset) as NoteRow[])
      : (db
          .prepare(
            `
            SELECT n.id, n.text, n.created_at, n.version
            FROM notes n
            INNER JOIN note_group_items ngi ON ngi.note_id = n.id
            WHERE ngi.group_id = ?
            ORDER BY datetime(n.created_at) DESC, n.id DESC
            LIMIT ? OFFSET ?
          `,
          )
          .all(parsedQuery.data.groupId, limit, offset) as NoteRow[])

  const total =
    parsedQuery.data.groupId === undefined
      ? (db.prepare('SELECT COUNT(*) as count FROM notes').get() as { count: number })
      : (db
          .prepare('SELECT COUNT(*) as count FROM note_group_items WHERE group_id = ?')
          .get(parsedQuery.data.groupId) as { count: number })

  return {
    items: rows.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      version: row.version,
    })),
    total: total.count,
    limit,
    offset,
  }
})

app.get('/api/groups', async () => {
  const rows = db
    .prepare(
      `
      SELECT ng.id, ng.name, ng.created_at, COUNT(ngi.note_id) as note_count
      FROM note_groups ng
      LEFT JOIN note_group_items ngi ON ngi.group_id = ng.id
      GROUP BY ng.id
      ORDER BY datetime(ng.created_at) DESC, ng.id DESC
    `,
    )
    .all() as GroupRow[]

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    noteCount: row.note_count,
  }))
})

app.post('/api/groups', async (request, reply) => {
  const parsed = createGroupSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      message: 'Некорректные данные группы',
      issues: parsed.error.issues,
    })
  }

  const uniqueNoteIds = [...new Set(parsed.data.noteIds)]
  const placeholders = uniqueNoteIds.map(() => '?').join(',')
  const existing = db
    .prepare(`SELECT COUNT(*) as count FROM notes WHERE id IN (${placeholders})`)
    .get(...uniqueNoteIds) as { count: number }

  if (existing.count !== uniqueNoteIds.length) {
    return reply.code(400).send({ message: 'Некоторые заметки не найдены' })
  }

  const now = new Date().toISOString()
  const trx = db.transaction(() => {
    const insertGroup = db.prepare('INSERT INTO note_groups (name, created_at) VALUES (?, ?)')
    const groupResult = insertGroup.run(parsed.data.name, now)
    const groupId = Number(groupResult.lastInsertRowid)

    const insertItem = db.prepare('INSERT INTO note_group_items (group_id, note_id) VALUES (?, ?)')
    for (const noteId of uniqueNoteIds) {
      insertItem.run(groupId, noteId)
    }

    return groupId
  })

  const groupId = trx()
  return reply.code(201).send({
    id: groupId,
    name: parsed.data.name,
    createdAt: now,
    noteCount: uniqueNoteIds.length,
  })
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
  const trx = db.transaction(() => {
    const noteResult = db.prepare('INSERT INTO notes (text, created_at, version) VALUES (?, ?, 1)').run(parsed.data.text, now)
    const noteId = Number(noteResult.lastInsertRowid)
    db.prepare('INSERT INTO note_versions (note_id, version, text, created_at) VALUES (?, ?, ?, ?)').run(
      noteId,
      1,
      parsed.data.text,
      now,
    )
    return noteId
  })
  const noteId = trx()

  return reply.code(201).send({
    id: noteId,
    text: parsed.data.text,
    createdAt: now,
    version: 1,
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

  const current = db
    .prepare('SELECT id, text, created_at, version FROM notes WHERE id = ?')
    .get(parsedParams.data.id) as NoteRow | undefined

  if (!current) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const now = new Date().toISOString()
  const nextVersion = current.version + 1
  const trx = db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO note_versions (note_id, version, text, created_at) VALUES (?, ?, ?, ?)').run(
      current.id,
      current.version,
      current.text,
      current.created_at,
    )
    db.prepare('UPDATE notes SET text = ?, version = ? WHERE id = ?').run(parsedBody.data.text, nextVersion, current.id)
    db.prepare('INSERT INTO note_versions (note_id, version, text, created_at) VALUES (?, ?, ?, ?)').run(
      current.id,
      nextVersion,
      parsedBody.data.text,
      now,
    )
  })
  trx()

  return {
    id: current.id,
    text: parsedBody.data.text,
    createdAt: current.created_at,
    version: nextVersion,
  }
})

app.get('/api/notes/:id/versions', async (request, reply) => {
  const parsedParams = noteParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор заметки',
      issues: parsedParams.error.issues,
    })
  }

  const noteExists = db.prepare('SELECT id FROM notes WHERE id = ?').get(parsedParams.data.id)
  if (!noteExists) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const rows = db
    .prepare(
      'SELECT version, text, created_at FROM note_versions WHERE note_id = ? ORDER BY version DESC',
    )
    .all(parsedParams.data.id) as NoteVersionRow[]

  return rows.map((row) => ({
    version: row.version,
    text: row.text,
    createdAt: row.created_at,
  }))
})

app.post('/api/notes/:id/versions/:version/restore', async (request, reply) => {
  const parsedParams = noteVersionParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректные параметры восстановления версии',
      issues: parsedParams.error.issues,
    })
  }

  const { id, version } = parsedParams.data
  const current = db.prepare('SELECT id, text, created_at, version FROM notes WHERE id = ?').get(id) as
    | NoteRow
    | undefined
  if (!current) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const target = db
    .prepare('SELECT version, text, created_at FROM note_versions WHERE note_id = ? AND version = ?')
    .get(id, version) as NoteVersionRow | undefined
  if (!target) {
    return reply.code(404).send({ message: 'Версия не найдена' })
  }

  const now = new Date().toISOString()
  const nextVersion = current.version + 1
  const trx = db.transaction(() => {
    db.prepare('INSERT OR IGNORE INTO note_versions (note_id, version, text, created_at) VALUES (?, ?, ?, ?)').run(
      current.id,
      current.version,
      current.text,
      current.created_at,
    )
    db.prepare('UPDATE notes SET text = ?, version = ? WHERE id = ?').run(target.text, nextVersion, current.id)
    db.prepare('INSERT INTO note_versions (note_id, version, text, created_at) VALUES (?, ?, ?, ?)').run(
      current.id,
      nextVersion,
      target.text,
      now,
    )
  })
  trx()

  return {
    id: current.id,
    text: target.text,
    createdAt: current.created_at,
    version: nextVersion,
  }
})

app.get('/api/notes/:id/comments', async (request, reply) => {
  const parsedParams = noteParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор заметки',
      issues: parsedParams.error.issues,
    })
  }

  const noteExists = db.prepare('SELECT id FROM notes WHERE id = ?').get(parsedParams.data.id)
  if (!noteExists) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const rows = db
    .prepare(
      `
      SELECT id, note_id, text, created_at, updated_at
      FROM note_comments
      WHERE note_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
    `,
    )
    .all(parsedParams.data.id) as NoteCommentRow[]

  return rows.map(mapComment)
})

app.post('/api/notes/:id/comments', async (request, reply) => {
  const parsedParams = noteParamsSchema.safeParse(request.params)
  const parsedBody = createCommentSchema.safeParse(request.body)

  if (!parsedParams.success || !parsedBody.success) {
    return reply.code(400).send({
      message: 'Некорректные данные комментария',
      issues: [...(parsedParams.error?.issues ?? []), ...(parsedBody.error?.issues ?? [])],
    })
  }

  const noteExists = db.prepare('SELECT id FROM notes WHERE id = ?').get(parsedParams.data.id)
  if (!noteExists) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const now = new Date().toISOString()
  const result = db
    .prepare('INSERT INTO note_comments (note_id, text, created_at, updated_at) VALUES (?, ?, ?, ?)')
    .run(parsedParams.data.id, parsedBody.data.text, now, now)

  const created = db
    .prepare('SELECT id, note_id, text, created_at, updated_at FROM note_comments WHERE id = ?')
    .get(Number(result.lastInsertRowid)) as NoteCommentRow | undefined

  if (!created) {
    return reply.code(500).send({ message: 'Комментарий не удалось создать' })
  }

  return reply.code(201).send(mapComment(created))
})

app.patch('/api/comments/:commentId', async (request, reply) => {
  const parsedParams = commentParamsSchema.safeParse(request.params)
  const parsedBody = createCommentSchema.safeParse(request.body)

  if (!parsedParams.success || !parsedBody.success) {
    return reply.code(400).send({
      message: 'Некорректные данные комментария',
      issues: [...(parsedParams.error?.issues ?? []), ...(parsedBody.error?.issues ?? [])],
    })
  }

  const now = new Date().toISOString()
  const result = db
    .prepare('UPDATE note_comments SET text = ?, updated_at = ? WHERE id = ?')
    .run(parsedBody.data.text, now, parsedParams.data.commentId)

  if (result.changes === 0) {
    return reply.code(404).send({ message: 'Комментарий не найден' })
  }

  const updated = db
    .prepare('SELECT id, note_id, text, created_at, updated_at FROM note_comments WHERE id = ?')
    .get(parsedParams.data.commentId) as NoteCommentRow | undefined

  if (!updated) {
    return reply.code(404).send({ message: 'Комментарий не найден' })
  }

  return mapComment(updated)
})

app.delete('/api/comments/:commentId', async (request, reply) => {
  const parsedParams = commentParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор комментария',
      issues: parsedParams.error.issues,
    })
  }

  const result = db.prepare('DELETE FROM note_comments WHERE id = ?').run(parsedParams.data.commentId)

  if (result.changes === 0) {
    return reply.code(404).send({ message: 'Комментарий не найден' })
  }

  return reply.code(204).send()
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
