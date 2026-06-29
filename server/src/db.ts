import Database from "better-sqlite3";

export type Db = Database.Database;

/** Open a SQLite database and ensure the schema exists. Use ":memory:" in tests. */
export function createDb(path: string): Db {
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      email         TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );
  `);
  return db;
}
