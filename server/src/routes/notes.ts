import type { RequestHandler } from "express";
import { randomUUID } from "node:crypto";
import type { CreateNoteRequest, Note } from "@team-notes/shared";
import type { Db } from "../db/index.js";
import { isMember } from "../db/teams.js";
import {
  deleteOwnedNote,
  findReadableNote,
  insertNote,
  listVisibleNotes,
  updateNoteFields,
  type NoteRow,
} from "../db/notes.js";

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
    lastEditedByEmail: row.last_edited_by_email,
  };
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
      if (!isMember(db, teamId, req.userId!)) {
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

    const id = randomUUID();
    const now = new Date().toISOString();
    insertNote(db, {
      id,
      title: request.title,
      content: request.content ?? "",
      owner_id: req.userId!,
      team_id: request.teamId ?? null,
      visibility: request.visibility ?? "private",
      created_at: now,
      updated_at: now,
      last_edited_by: req.userId!,
    });

    res.status(201).json(toNote(findReadableNote(db, id, req.userId!)!));
  };
}

export function getNote(db: Db): RequestHandler {
  return (req, res) => {
    // readable if owned or shared via a team; otherwise 404 (no existence leak)
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
    // owners and team members can edit content; only the owner changes
    // visibility. findReadableNote() yields exactly that edit set.
    const note = findReadableNote(db, String(req.params.id), req.userId!);
    if (!note) {
      res.status(404).json({ error: "note not found" });
      return;
    }
    const isOwner = note.owner_id === req.userId;

    const { title, content, visibility, teamId } = req.body ?? {};
    const updated = { ...note, updated_at: new Date().toISOString() };
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
      if (!isOwner) {
        res.status(403).json({ error: "only the owner can change visibility" });
        return;
      }
      if (visibility === "team") {
        if (typeof teamId !== "string" || teamId === "") {
          res.status(400).json({ error: "teamId is required for team notes" });
          return;
        }
        if (!isMember(db, teamId, req.userId!)) {
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

    updateNoteFields(db, note.id, {
      title: updated.title,
      content: updated.content,
      visibility: updated.visibility,
      team_id: updated.team_id,
      updated_at: updated.updated_at,
      last_edited_by: req.userId!,
    });

    res.json(toNote(findReadableNote(db, note.id, req.userId!)!));
  };
}

export function deleteNote(db: Db): RequestHandler {
  return (req, res) => {
    const deleted = deleteOwnedNote(db, String(req.params.id), req.userId!);
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
