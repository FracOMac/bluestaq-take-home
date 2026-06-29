import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomUUID } from "node:crypto";
import type { AuthResponse, User } from "@team-notes/shared";
import type { Db } from "../db.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

export function register(db: Db): RequestHandler {
  return async (req, res) => {
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
  };
}

export function login(db: Db): RequestHandler {
  return async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "email and password are required" });
      return;
    }

    const row = db
      .prepare("SELECT id, email, password_hash, created_at FROM users WHERE email = ?")
      .get(email.toLowerCase().trim()) as
      | { id: string; email: string; password_hash: string; created_at: string }
      | undefined;

    if (!row || !(await bcrypt.compare(password, row.password_hash))) {
      res.status(401).json({ error: "invalid email or password" });
      return;
    }

    const token = jwt.sign({ sub: row.id }, JWT_SECRET, {
      expiresIn: JWT_EXPIRES_IN,
    });
    const body: AuthResponse = {
      token,
      user: { id: row.id, email: row.email, createdAt: row.created_at },
    };
    res.json(body);
  };
}
