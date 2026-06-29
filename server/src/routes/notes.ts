import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type { Note, Visibility } from "@team-notes/shared";
import { insert, selectWhere, type Db } from "../db.js";

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

    const now = new Date().toISOString();
    const row: NoteRow = {
      id: randomUUID(),
      title: title.trim(),
      content: typeof content === "string" ? content : "",
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
