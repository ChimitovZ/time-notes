import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

import Database from 'better-sqlite3'

const dbPath = resolve(process.cwd(), 'data', 'notes.db')
mkdirSync(dirname(dbPath), { recursive: true })

export const db = new Database(dbPath)

db.exec(`
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    created_at TEXT NOT NULL
  )
`)
