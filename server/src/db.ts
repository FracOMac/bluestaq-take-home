import Database from "better-sqlite3";

export type Db = Database.Database;

/** Open a SQLite database and ensure the schema exists.*/
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

    CREATE TABLE IF NOT EXISTS notes (
      id         TEXT PRIMARY KEY,
      title      TEXT NOT NULL,
      content    TEXT NOT NULL DEFAULT '',
      owner_id   TEXT NOT NULL REFERENCES users(id),
      team_id    TEXT,
      visibility TEXT NOT NULL DEFAULT 'private',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_notes_owner ON notes(owner_id);
  `);
  return db;
}

type SqlValue = string | number | bigint | Buffer | null;

export function insert(db: Db, table: string, row: object): void {
  const cols = Object.keys(row);
  const placeholders = cols.map((c) => `@${c}`).join(", ");
  db.prepare(
    `INSERT INTO ${table} (${cols.join(", ")}) VALUES (${placeholders})`,
  ).run(row as Record<string, SqlValue>);
}

export function selectWhere<T>(
  db: Db,
  table: string,
  where: object,
  orderBy?: string,
): T[] {
  const cols = Object.keys(where);
  const clause = cols.length
    ? ` WHERE ${cols.map((c) => `${c} = @${c}`).join(" AND ")}`
    : "";
  const order = orderBy ? ` ORDER BY ${orderBy}` : "";
  return db
    .prepare(`SELECT * FROM ${table}${clause}${order}`)
    .all(where as Record<string, SqlValue>) as T[];
}

export function update(
  db: Db,
  table: string,
  changes: object,
  where: object,
): void {
  const setClause = Object.keys(changes)
    .map((c) => `${c} = @${c}`)
    .join(", ");
  const whereClause = Object.keys(where)
    .map((c) => `${c} = @where_${c}`)
    .join(" AND ");

  const params: Record<string, SqlValue> = { ...changes } as Record<string, SqlValue>;
  for (const [key, value] of Object.entries(where)) {
    params[`where_${key}`] = value as SqlValue;
  }

  db.prepare(`UPDATE ${table} SET ${setClause} WHERE ${whereClause}`).run(params);
}

export function remove(db: Db, table: string, where: object): number {
  const whereClause = Object.keys(where)
    .map((c) => `${c} = @${c}`)
    .join(" AND ");
  const result = db
    .prepare(`DELETE FROM ${table} WHERE ${whereClause}`)
    .run(where as Record<string, SqlValue>);
  return result.changes;
}
