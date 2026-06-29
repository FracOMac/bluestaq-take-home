import express from "express";
import type { HealthResponse } from "@team-notes/shared";
import type { Db } from "./db.js";
import { requireAuth } from "./requireAuth.js";
import { register, login } from "./routes/auth.js";
import { createNote, listNotes } from "./routes/notes.js";

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

  return app;
}
