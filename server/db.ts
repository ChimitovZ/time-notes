import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import Database from 'better-sqlite3'

const dbPath = resolve(process.cwd(), 'data', 'notes.db')
mkdirSync(dirname(dbPath), { recursive: true })

export const db = new Database(dbPath)

db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`)

const notesColumns = db
  .prepare("SELECT name FROM pragma_table_info('notes')")
  .all() as Array<{ name: string }>
if (!notesColumns.some((column) => column.name === 'version')) {
  db.exec('ALTER TABLE notes ADD COLUMN version INTEGER NOT NULL DEFAULT 1')
}
if (!notesColumns.some((column) => column.name === 'starred')) {
  db.exec('ALTER TABLE notes ADD COLUMN starred INTEGER NOT NULL DEFAULT 0')
}
if (!notesColumns.some((column) => column.name === 'user_id')) {
  db.exec('ALTER TABLE notes ADD COLUMN user_id INTEGER')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS note_versions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    version INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
    UNIQUE(note_id, version)
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS note_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    note_id INTEGER NOT NULL,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  )
`)
const commentsColumns = db
  .prepare("SELECT name FROM pragma_table_info('note_comments')")
  .all() as Array<{ name: string }>
if (!commentsColumns.some((column) => column.name === 'user_id')) {
  db.exec('ALTER TABLE note_comments ADD COLUMN user_id INTEGER')
}

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_note_comments_note_id_created_at
  ON note_comments(note_id, created_at DESC)
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS note_groups (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`)
const groupsColumns = db
  .prepare("SELECT name FROM pragma_table_info('note_groups')")
  .all() as Array<{ name: string }>
if (!groupsColumns.some((column) => column.name === 'user_id')) {
  db.exec('ALTER TABLE note_groups ADD COLUMN user_id INTEGER')
}

db.exec(`
  CREATE TABLE IF NOT EXISTS note_group_items (
    group_id INTEGER NOT NULL,
    note_id INTEGER NOT NULL,
    PRIMARY KEY (group_id, note_id),
    FOREIGN KEY (group_id) REFERENCES note_groups(id) ON DELETE CASCADE,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  )
`)
