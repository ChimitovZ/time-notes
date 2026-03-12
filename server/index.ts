import Fastify, { type FastifyReply, type FastifyRequest } from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'
import session from '@fastify/session'
import { z } from 'zod'
import argon2 from 'argon2'

import { improveTextWithAi } from './ai'
import { db } from './db'

type NoteRow = {
  id: number
  text: string
  created_at: string
  version: number
  starred?: number
  user_id?: number | null
}
type GroupRow = {
  id: number
  name: string
  created_at: string
  note_count: number
  user_id?: number | null
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
  user_id: number | null
}
type UserRow = {
  id: number
  email: string
  password_hash: string
  created_at: string
}

declare module 'fastify' {
  interface Session {
    userId?: number
  }
}

const app = Fastify({ logger: true })
const port = Number(process.env.PORT ?? 3001)

await app.register(cors, { origin: true, credentials: true })
await app.register(cookie)
await app.register(session, {
  secret: process.env.SESSION_SECRET ?? 'dev-session-secret-change-me-0123456789',
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  },
})

const createNoteSchema = z.object({
  text: z.string().trim().min(1).max(4000),
})
const updateNoteSchema = createNoteSchema
const toggleStarSchema = z.object({
  starred: z.boolean(),
})
const listNotesQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
  groupId: z.coerce.number().int().min(1).optional(),
})
const noteParamsSchema = z.object({
  id: z.coerce.number().int().min(1),
})
const groupParamsSchema = z.object({
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
const registerSchema = z.object({
  email: z.string().email().trim().max(160),
  password: z.string().min(8).max(128),
})
const loginSchema = registerSchema

function getUserId(request: FastifyRequest): number | null {
  return request.session.userId ?? null
}

function requireAuth(request: FastifyRequest, reply: FastifyReply): number | null {
  if (!request.session.userId) {
    reply.code(401).send({ message: 'Требуется авторизация' })
    return null
  }

  return request.session.userId
}

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

app.get('/api/auth/me', async (request, reply) => {
  const userId = getUserId(request)
  if (!userId) {
    return reply.code(401).send({ message: 'Не авторизован' })
  }

  const user = db.prepare('SELECT id, email, created_at, password_hash FROM users WHERE id = ?').get(userId) as
    | UserRow
    | undefined
  if (!user) {
    request.session.userId = undefined
    return reply.code(401).send({ message: 'Не авторизован' })
  }

  return { id: user.id, email: user.email, createdAt: user.created_at }
})

app.post('/api/auth/register', async (request, reply) => {
  const parsed = registerSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.code(400).send({ message: 'Некорректные данные регистрации', issues: parsed.error.issues })
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(parsed.data.email)
  if (existing) {
    return reply.code(409).send({ message: 'Пользователь с таким email уже существует' })
  }

  const now = new Date().toISOString()
  const passwordHash = await argon2.hash(parsed.data.password)
  const result = db
    .prepare('INSERT INTO users (email, password_hash, created_at) VALUES (?, ?, ?)')
    .run(parsed.data.email, passwordHash, now)
  const userId = Number(result.lastInsertRowid)
  request.session.userId = userId

  return reply.code(201).send({ id: userId, email: parsed.data.email, createdAt: now })
})

app.post('/api/auth/login', async (request, reply) => {
  const parsed = loginSchema.safeParse(request.body)
  if (!parsed.success) {
    return reply.code(400).send({ message: 'Некорректные данные входа', issues: parsed.error.issues })
  }

  const user = db.prepare('SELECT id, email, password_hash, created_at FROM users WHERE email = ?').get(parsed.data.email) as
    | UserRow
    | undefined
  if (!user) {
    return reply.code(401).send({ message: 'Неверный email или пароль' })
  }

  const ok = await argon2.verify(user.password_hash, parsed.data.password)
  if (!ok) {
    return reply.code(401).send({ message: 'Неверный email или пароль' })
  }

  request.session.userId = user.id
  return { id: user.id, email: user.email, createdAt: user.created_at }
})

app.post('/api/auth/logout', async (request) => {
  request.session.userId = undefined
  return { ok: true }
})

app.get('/api/notes', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

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
            'SELECT id, text, created_at, version, starred FROM notes WHERE user_id = ? ORDER BY datetime(created_at) DESC, id DESC LIMIT ? OFFSET ?',
          )
          .all(userId, limit, offset) as NoteRow[])
      : (db
          .prepare(
            `
            SELECT n.id, n.text, n.created_at, n.version, n.starred
            FROM notes n
            INNER JOIN note_group_items ngi ON ngi.note_id = n.id
            INNER JOIN note_groups ng ON ng.id = ngi.group_id
            WHERE ngi.group_id = ?
            AND n.user_id = ?
            AND ng.user_id = ?
            ORDER BY datetime(n.created_at) DESC, n.id DESC
            LIMIT ? OFFSET ?
          `,
          )
          .all(parsedQuery.data.groupId, userId, userId, limit, offset) as NoteRow[])

  const total =
    parsedQuery.data.groupId === undefined
      ? (db.prepare('SELECT COUNT(*) as count FROM notes WHERE user_id = ?').get(userId) as { count: number })
      : (db
          .prepare(
            `
            SELECT COUNT(*) as count
            FROM note_group_items ngi
            INNER JOIN note_groups ng ON ng.id = ngi.group_id
            INNER JOIN notes n ON n.id = ngi.note_id
            WHERE ngi.group_id = ? AND ng.user_id = ? AND n.user_id = ?
          `,
          )
          .get(parsedQuery.data.groupId, userId, userId) as { count: number })

  return {
    items: rows.map((row) => ({
      id: row.id,
      text: row.text,
      createdAt: row.created_at,
      version: row.version,
      starred: Boolean(row.starred),
    })),
    total: total.count,
    limit,
    offset,
  }
})

app.get('/api/groups', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const rows = db
    .prepare(
      `
      SELECT ng.id, ng.name, ng.created_at, COUNT(ngi.note_id) as note_count
      FROM note_groups ng
      LEFT JOIN note_group_items ngi ON ngi.group_id = ng.id
      WHERE ng.user_id = ?
      GROUP BY ng.id
      ORDER BY datetime(ng.created_at) DESC, ng.id DESC
    `,
    )
    .all(userId) as GroupRow[]

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    noteCount: row.note_count,
  }))
})

app.post('/api/groups', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsed = createGroupSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      message: 'Некорректные данные группы',
      issues: parsed.error.issues,
    })
  }

  const uniqueNoteIds = [...new Set(parsed.data.noteIds)]
  if (uniqueNoteIds.length === 0) {
    return reply.code(400).send({ message: 'Нужно выбрать хотя бы одну заметку' })
  }
  const placeholders = uniqueNoteIds.map(() => '?').join(',')
  const existing = db
    .prepare(`SELECT COUNT(*) as count FROM notes WHERE user_id = ? AND id IN (${placeholders})`)
    .get(userId, ...uniqueNoteIds) as { count: number }

  if (existing.count !== uniqueNoteIds.length) {
    return reply.code(400).send({ message: 'Некоторые заметки не найдены' })
  }

  const now = new Date().toISOString()
  const trx = db.transaction(() => {
    const insertGroup = db.prepare('INSERT INTO note_groups (name, created_at, user_id) VALUES (?, ?, ?)')
    const groupResult = insertGroup.run(parsed.data.name, now, userId)
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

app.delete('/api/groups/:id', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = groupParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор группы',
      issues: parsedParams.error.issues,
    })
  }

  const result = db.prepare('DELETE FROM note_groups WHERE id = ? AND user_id = ?').run(parsedParams.data.id, userId)

  if (result.changes === 0) {
    return reply.code(404).send({ message: 'Группа не найдена' })
  }

  return reply.code(204).send()
})

app.post('/api/notes', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsed = createNoteSchema.safeParse(request.body)

  if (!parsed.success) {
    return reply.code(400).send({
      message: 'Некорректный текст заметки',
      issues: parsed.error.issues,
    })
  }

  const now = new Date().toISOString()
  const trx = db.transaction(() => {
    const noteResult = db
      .prepare('INSERT INTO notes (text, created_at, version, starred, user_id) VALUES (?, ?, 1, 0, ?)')
      .run(parsed.data.text, now, userId)
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
    starred: false,
  })
})

app.post('/api/ai/improve', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

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
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = noteParamsSchema.safeParse(request.params)
  const parsedBody = updateNoteSchema.safeParse(request.body)

  if (!parsedParams.success || !parsedBody.success) {
    return reply.code(400).send({
      message: 'Некорректные данные для обновления заметки',
      issues: [...(parsedParams.error?.issues ?? []), ...(parsedBody.error?.issues ?? [])],
    })
  }

  const current = db
    .prepare('SELECT id, text, created_at, version, starred, user_id FROM notes WHERE id = ? AND user_id = ?')
    .get(parsedParams.data.id, userId) as NoteRow | undefined

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
    starred: Boolean(current.starred),
  }
})

app.patch('/api/notes/:id/star', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = noteParamsSchema.safeParse(request.params)
  const parsedBody = toggleStarSchema.safeParse(request.body)

  if (!parsedParams.success || !parsedBody.success) {
    return reply.code(400).send({
      message: 'Некорректные данные для обновления избранного',
      issues: [...(parsedParams.error?.issues ?? []), ...(parsedBody.error?.issues ?? [])],
    })
  }

  const result = db
    .prepare('UPDATE notes SET starred = ? WHERE id = ? AND user_id = ?')
    .run(parsedBody.data.starred ? 1 : 0, parsedParams.data.id, userId)

  if (result.changes === 0) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const updated = db
    .prepare('SELECT id, text, created_at, version, starred FROM notes WHERE id = ? AND user_id = ?')
    .get(parsedParams.data.id, userId) as NoteRow | undefined
  if (!updated) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  return {
    id: updated.id,
    text: updated.text,
    createdAt: updated.created_at,
    version: updated.version,
    starred: Boolean(updated.starred),
  }
})

app.get('/api/notes/:id/versions', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = noteParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор заметки',
      issues: parsedParams.error.issues,
    })
  }

  const noteExists = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(parsedParams.data.id, userId)
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
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = noteVersionParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректные параметры восстановления версии',
      issues: parsedParams.error.issues,
    })
  }

  const { id, version } = parsedParams.data
  const current = db.prepare('SELECT id, text, created_at, version, starred, user_id FROM notes WHERE id = ? AND user_id = ?').get(id, userId) as
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
    starred: Boolean(current.starred),
  }
})

app.get('/api/notes/:id/comments', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = noteParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор заметки',
      issues: parsedParams.error.issues,
    })
  }

  const noteExists = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(parsedParams.data.id, userId)
  if (!noteExists) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const rows = db
    .prepare(
      `
      SELECT id, note_id, text, created_at, updated_at, user_id
      FROM note_comments
      WHERE note_id = ? AND user_id = ?
      ORDER BY datetime(created_at) DESC, id DESC
    `,
    )
    .all(parsedParams.data.id, userId) as NoteCommentRow[]

  return rows.map(mapComment)
})

app.post('/api/notes/:id/comments', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = noteParamsSchema.safeParse(request.params)
  const parsedBody = createCommentSchema.safeParse(request.body)

  if (!parsedParams.success || !parsedBody.success) {
    return reply.code(400).send({
      message: 'Некорректные данные комментария',
      issues: [...(parsedParams.error?.issues ?? []), ...(parsedBody.error?.issues ?? [])],
    })
  }

  const noteExists = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(parsedParams.data.id, userId)
  if (!noteExists) {
    return reply.code(404).send({ message: 'Заметка не найдена' })
  }

  const now = new Date().toISOString()
  const result = db
    .prepare('INSERT INTO note_comments (note_id, text, created_at, updated_at, user_id) VALUES (?, ?, ?, ?, ?)')
    .run(parsedParams.data.id, parsedBody.data.text, now, now, userId)

  const created = db
    .prepare('SELECT id, note_id, text, created_at, updated_at, user_id FROM note_comments WHERE id = ? AND user_id = ?')
    .get(Number(result.lastInsertRowid), userId) as NoteCommentRow | undefined

  if (!created) {
    return reply.code(500).send({ message: 'Комментарий не удалось создать' })
  }

  return reply.code(201).send(mapComment(created))
})

app.patch('/api/comments/:commentId', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

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
    .prepare('UPDATE note_comments SET text = ?, updated_at = ? WHERE id = ? AND user_id = ?')
    .run(parsedBody.data.text, now, parsedParams.data.commentId, userId)

  if (result.changes === 0) {
    return reply.code(404).send({ message: 'Комментарий не найден' })
  }

  const updated = db
    .prepare('SELECT id, note_id, text, created_at, updated_at, user_id FROM note_comments WHERE id = ? AND user_id = ?')
    .get(parsedParams.data.commentId, userId) as NoteCommentRow | undefined

  if (!updated) {
    return reply.code(404).send({ message: 'Комментарий не найден' })
  }

  return mapComment(updated)
})

app.delete('/api/comments/:commentId', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = commentParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор комментария',
      issues: parsedParams.error.issues,
    })
  }

  const result = db.prepare('DELETE FROM note_comments WHERE id = ? AND user_id = ?').run(parsedParams.data.commentId, userId)

  if (result.changes === 0) {
    return reply.code(404).send({ message: 'Комментарий не найден' })
  }

  return reply.code(204).send()
})

app.delete('/api/notes/:id', async (request, reply) => {
  const userId = requireAuth(request, reply)
  if (!userId) return

  const parsedParams = noteParamsSchema.safeParse(request.params)

  if (!parsedParams.success) {
    return reply.code(400).send({
      message: 'Некорректный идентификатор заметки',
      issues: parsedParams.error.issues,
    })
  }

  const result = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(parsedParams.data.id, userId)

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
