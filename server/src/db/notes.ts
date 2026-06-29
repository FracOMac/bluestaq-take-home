import { insert, update, remove, type Db } from "./index.js";
import type { Visibility } from "@team-notes/shared";

export interface NoteRow {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  team_id: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
  last_edited_by: string;
  last_edited_by_email: string; // joined from users
}

export interface NoteFields {
  title: string;
  content: string;
  visibility: Visibility;
  team_id: string | null;
  updated_at: string;
  last_edited_by: string;
}

// every read returns the note alongside the email of its last editor
const NOTE_SELECT = `
  SELECT n.*, e.email AS last_edited_by_email
  FROM notes n
  JOIN users e ON e.id = n.last_edited_by`;

// a note is visible to a user if they own it, or it's a team note for a team
// they belong to — the one authorization rule, kept in one place
const VISIBLE_TO = `(
  n.owner_id = @userId
  OR (n.visibility = 'team' AND n.team_id IN (
    SELECT team_id FROM team_members WHERE user_id = @userId
  ))
)`;

export function listVisibleNotes(db: Db, userId: string): NoteRow[] {
  return db
    .prepare(`${NOTE_SELECT} WHERE ${VISIBLE_TO} ORDER BY n.created_at DESC`)
    .all({ userId }) as NoteRow[];
}

export function findReadableNote(
  db: Db,
  id: string,
  userId: string,
): NoteRow | undefined {
  return db
    .prepare(`${NOTE_SELECT} WHERE n.id = @id AND ${VISIBLE_TO}`)
    .get({ id, userId }) as NoteRow | undefined;
}

export function insertNote(
  db: Db,
  note: NoteFields & { id: string; owner_id: string; created_at: string },
): void {
  insert(db, "notes", note);
}

export function updateNoteFields(db: Db, id: string, fields: NoteFields): void {
  update(db, "notes", fields, { id });
}

export function deleteOwnedNote(db: Db, id: string, ownerId: string): number {
  return remove(db, "notes", { id, owner_id: ownerId });
}
