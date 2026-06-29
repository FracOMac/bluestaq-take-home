import express from "express";
import type { HealthResponse } from "@team-notes/shared";
import type { Db } from "./db.js";
import { requireAuth } from "./requireAuth.js";
import { register, login } from "./routes/auth.js";
import {
  createNote,
  listNotes,
  getNote,
  updateNote,
  deleteNote,
} from "./routes/notes.js";
import { createTeam, listTeams, getTeam } from "./routes/teams.js";

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    const body: HealthResponse = { status: "ok" };
    res.json(body);
  });

  app.post("/auth/register", register(db));
  app.post("/auth/login", login(db));

  app.post("/notes", requireAuth, createNote(db));
  app.get("/notes", requireAuth, listNotes(db));
  app.get("/notes/:id", requireAuth, getNote(db));
  app.patch("/notes/:id", requireAuth, updateNote(db));
  app.delete("/notes/:id", requireAuth, deleteNote(db));

  app.post("/teams", requireAuth, createTeam(db));
  app.get("/teams", requireAuth, listTeams(db));
  app.get("/teams/:id", requireAuth, getTeam(db));

  return app;
}
