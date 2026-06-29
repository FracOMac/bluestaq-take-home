import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type { CreateNoteRequest, Note, Visibility } from "@team-notes/shared";
import { insert, selectWhere, update, remove, type Db } from "../db.js";

interface NoteRow {
  id: string;
  title: string;
  content: string;
  owner_id: string;
  team_id: string | null;
  visibility: Visibility;
  created_at: string;
  updated_at: string;
}

function toNote(row: NoteRow): Note {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    ownerId: row.owner_id,
    teamId: row.team_id,
    visibility: row.visibility,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function isTeamMember(db: Db, teamId: string, userId: string): boolean {
  return Boolean(
    selectWhere(db, "team_members", { team_id: teamId, user_id: userId })[0],
  );
}

// A note is visible to a user if they own it, or it's a team note for a team
// they belong to. Shared by the list and get-by-id queries.
const VISIBLE_TO = `(
  owner_id = @userId
  OR (visibility = 'team' AND team_id IN (
    SELECT team_id FROM team_members WHERE user_id = @userId
  ))
)`;

function listVisibleNotes(db: Db, userId: string): NoteRow[] {
  return db
    .prepare(`SELECT * FROM notes WHERE ${VISIBLE_TO} ORDER BY created_at DESC`)
    .all({ userId }) as NoteRow[];
}

function findReadableNote(
  db: Db,
  id: string,
  userId: string,
): NoteRow | undefined {
  return db
    .prepare(`SELECT * FROM notes WHERE id = @id AND ${VISIBLE_TO}`)
    .get({ id, userId }) as NoteRow | undefined;
}

export function createNote(db: Db): RequestHandler {
  return (req, res) => {
    const { title, content, visibility, teamId } = req.body ?? {};
    if (typeof title !== "string" || title.trim() === "") {
      res.status(400).json({ error: "title is required" });
      return;
    }

    const isTeam = visibility === "team";
    if (isTeam) {
      if (typeof teamId !== "string" || teamId === "") {
        res.status(400).json({ error: "teamId is required for team notes" });
        return;
      }
      if (!isTeamMember(db, teamId, req.userId!)) {
        res.status(403).json({ error: "you are not a member of that team" });
        return;
      }
    }

    const request: CreateNoteRequest = {
      title: title.trim(),
      content: typeof content === "string" ? content : "",
      visibility: isTeam ? "team" : "private",
      ...(isTeam ? { teamId } : {}),
    };

    const now = new Date().toISOString();
    const row: NoteRow = {
      id: randomUUID(),
      title: request.title,
      content: request.content ?? "",
      owner_id: req.userId!,
      team_id: request.teamId ?? null,
      visibility: request.visibility ?? "private",
      created_at: now,
      updated_at: now,
    };
    insert(db, "notes", row);

    res.status(201).json(toNote(row));
  };
}

export function getNote(db: Db): RequestHandler {
  return (req, res) => {
    // Readable if owned or shared via a team; otherwise 404 (no existence leak).
    const note = findReadableNote(db, String(req.params.id), req.userId!);
    if (!note) {
      res.status(404).json({ error: "note not found" });
      return;
    }
    res.json(toNote(note));
  };
}

export function updateNote(db: Db): RequestHandler {
  return (req, res) => {
    // Editing (including changing visibility) is owner-only.
    const note = selectWhere<NoteRow>(db, "notes", {
      id: req.params.id,
      owner_id: req.userId,
    })[0];
    if (!note) {
      res.status(404).json({ error: "note not found" });
      return;
    }

    const { title, content, visibility, teamId } = req.body ?? {};
    const updated: NoteRow = { ...note, updated_at: new Date().toISOString() };
    let changed = false;

    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        res.status(400).json({ error: "title must be a non-empty string" });
        return;
      }
      updated.title = title.trim();
      changed = true;
    }
    if (content !== undefined) {
      if (typeof content !== "string") {
        res.status(400).json({ error: "content must be a string" });
        return;
      }
      updated.content = content;
      changed = true;
    }
    if (visibility !== undefined) {
      if (visibility === "team") {
        if (typeof teamId !== "string" || teamId === "") {
          res.status(400).json({ error: "teamId is required for team notes" });
          return;
        }
        if (!isTeamMember(db, teamId, req.userId!)) {
          res.status(403).json({ error: "you are not a member of that team" });
          return;
        }
        updated.visibility = "team";
        updated.team_id = teamId;
      } else if (visibility === "private") {
        updated.visibility = "private";
        updated.team_id = null;
      } else {
        res.status(400).json({ error: "invalid visibility" });
        return;
      }
      changed = true;
    }
    if (!changed) {
      res.status(400).json({ error: "no updatable fields provided" });
      return;
    }

    update(
      db,
      "notes",
      {
        title: updated.title,
        content: updated.content,
        visibility: updated.visibility,
        team_id: updated.team_id,
        updated_at: updated.updated_at,
      },
      { id: updated.id },
    );

    res.json(toNote(updated));
  };
}

export function deleteNote(db: Db): RequestHandler {
  return (req, res) => {
    const deleted = remove(db, "notes", {
      id: req.params.id,
      owner_id: req.userId,
    });
    if (deleted === 0) {
      res.status(404).json({ error: "note not found" });
      return;
    }
    res.status(204).end();
  };
}

export function listNotes(db: Db): RequestHandler {
  return (req, res) => {
    const rows = listVisibleNotes(db, req.userId!);
    res.json(rows.map(toNote));
  };
}
