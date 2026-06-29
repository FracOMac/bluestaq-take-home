import express from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type { HealthResponse, User } from "@team-notes/shared";
import type { Db } from "./db.js";

export function createApp(db: Db) {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    const body: HealthResponse = { status: "ok" };
    res.json(body);
  });

  app.post("/auth/register", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
      res.status(400).json({ error: "email and password (min 8 chars) are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    if (db.prepare("SELECT 1 FROM users WHERE email = ?").get(normalizedEmail)) {
      res.status(409).json({ error: "email already registered" });
      return;
    }

    const user: User = {
      id: randomUUID(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
    };
    const passwordHash = await bcrypt.hash(password, 10);
    db.prepare(
      "INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)",
    ).run(user.id, user.email, passwordHash, user.createdAt);

    res.status(201).json(user);
  });

  return app;
}
