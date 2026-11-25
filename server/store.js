import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

const root = path.resolve(process.env.DATA_DIR || './data');
fs.mkdirSync(root, { recursive: true });
const filename = path.join(root, 'studybuddy.sqlite');
const db = new DatabaseSync(filename);
db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS app_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    payload TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );
`);
const empty = { users: [], subjects: [], sessions: [], flashcards: [], chats: [], quizzes: [], documents: [], plans: [] };
const row = db.prepare('SELECT payload FROM app_state WHERE id = 1').get();
let state;
try {
  if (row) state = JSON.parse(row.payload);
  else {
    const legacyFile = path.join(root, 'db.json');
    state = fs.existsSync(legacyFile) ? JSON.parse(fs.readFileSync(legacyFile, 'utf8')) : structuredClone(empty);
  }
}
catch { throw new Error('The StudyBuddy SQLite database is corrupt. Restore it from a backup.'); }
for (const [key, value] of Object.entries(empty)) if (!Array.isArray(state[key])) state[key] = value;
if (!row) { const migrate = db.prepare('INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)'); migrate.run(JSON.stringify(state), new Date().toISOString()); }
const save = db.prepare(`INSERT INTO app_state (id, payload, updated_at) VALUES (1, ?, ?)
  ON CONFLICT(id) DO UPDATE SET payload=excluded.payload, updated_at=excluded.updated_at`);
export function read() { return state; }
export function write() { save.run(JSON.stringify(state), new Date().toISOString()); }
export function uid() { return globalThis.crypto.randomUUID(); }
export function closeStore() { db.close(); }
