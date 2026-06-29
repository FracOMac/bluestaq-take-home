import { insert, type Db } from "./index.js";

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

export function findUserByEmail(db: Db, email: string): UserRow | undefined {
  return db
    .prepare("SELECT * FROM users WHERE email = @email")
    .get({ email }) as UserRow | undefined;
}

export function insertUser(
  db: Db,
  user: { id: string; email: string; passwordHash: string; createdAt: string },
): void {
  insert(db, "users", {
    id: user.id,
    email: user.email,
    password_hash: user.passwordHash,
    created_at: user.createdAt,
  });
}
