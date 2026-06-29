import express from "express";
import type { HealthResponse } from "@team-notes/shared";
import type { Db } from "./db.js";
import { register, login } from "./routes/auth.js";

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    const body: HealthResponse = { status: "ok" };
    res.json(body);
  });

  app.post("/auth/register", register(db));
  app.post("/auth/login", login(db));

  return app;
}
