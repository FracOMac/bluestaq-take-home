import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type {
  CreateNoteRequest,
  Note,
  UpdateNoteRequest,
  Visibility,
} from "@team-notes/shared";
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

export function createNote(db: Db): RequestHandler {
  return (req, res) => {
    const { title, content } = req.body ?? {};
    if (typeof title !== "string" || title.trim() === "") {
      res.status(400).json({ error: "title is required" });
      return;
    }
    const request: CreateNoteRequest = {
      title: title.trim(),
      content: typeof content === "string" ? content : "",
    };

    const now = new Date().toISOString();
    const row: NoteRow = {
      id: randomUUID(),
      title: request.title,
      content: request.content ?? "",
      owner_id: req.userId!,
      team_id: null,
      visibility: "private",
      created_at: now,
      updated_at: now,
    };
    insert(db, "notes", row);

    res.status(201).json(toNote(row));
  };
}

export function getNote(db: Db): RequestHandler {
  return (req, res) => {
    // Match on id AND owner, so a note the caller doesn't own reads as 404
    // (no leaking that someone else's note exists).
    const rows = selectWhere<NoteRow>(db, "notes", {
      id: req.params.id,
      owner_id: req.userId,
    });
    if (!rows[0]) {
      res.status(404).json({ error: "note not found" });
      return;
    }
    res.json(toNote(rows[0]));
  };
}

export function updateNote(db: Db): RequestHandler {
  return (req, res) => {
    const { title, content } = req.body ?? {};

    const updates: UpdateNoteRequest = {};
    if (title !== undefined) {
      if (typeof title !== "string" || title.trim() === "") {
        res.status(400).json({ error: "title must be a non-empty string" });
        return;
      }
      updates.title = title.trim();
    }
    if (content !== undefined) {
      if (typeof content !== "string") {
        res.status(400).json({ error: "content must be a string" });
        return;
      }
      updates.content = content;
    }
    if (updates.title === undefined && updates.content === undefined) {
      res.status(400).json({ error: "no updatable fields provided" });
      return;
    }

    const rows = selectWhere<NoteRow>(db, "notes", {
      id: req.params.id,
      owner_id: req.userId,
    });
    const note = rows[0];
    if (!note) {
      res.status(404).json({ error: "note not found" });
      return;
    }

    const updated: NoteRow = {
      ...note,
      title: updates.title ?? note.title,
      content: updates.content ?? note.content,
      updated_at: new Date().toISOString(),
    };
    update(
      db,
      "notes",
      {
        title: updated.title,
        content: updated.content,
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
    const rows = selectWhere<NoteRow>(
      db,
      "notes",
      { owner_id: req.userId },
      "created_at DESC",
    );
    res.json(rows.map(toNote));
  };
}
