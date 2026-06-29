import type { RequestHandler } from "express";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import type {
  AuthResponse,
  LoginRequest,
  RegisterRequest,
  User,
} from "@team-notes/shared";
import type { Db } from "../db/index.js";
import { signToken } from "../token.js";
import { findUserByEmail, insertUser } from "../db/users.js";

export function register(db: Db): RequestHandler {
  return async (req, res) => {
    const { email, password } = req.body ?? {};
    if (
      typeof email !== "string" ||
      typeof password !== "string" ||
      password.length < 8
    ) {
      res
        .status(400)
        .json({ error: "email and password (min 8 chars) are required" });
      return;
    }
    const request: RegisterRequest = { email, password };

    const normalizedEmail = request.email.toLowerCase().trim();
    if (findUserByEmail(db, normalizedEmail)) {
      res.status(409).json({ error: "email already registered" });
      return;
    }

    const user: User = {
      id: randomUUID(),
      email: normalizedEmail,
      createdAt: new Date().toISOString(),
    };
    const passwordHash = await bcrypt.hash(request.password, 10);
    insertUser(db, {
      id: user.id,
      email: user.email,
      passwordHash,
      createdAt: user.createdAt,
    });

    const body: AuthResponse = { token: signToken(user.id), user };
    res.status(201).json(body);
  };
}

export function login(db: Db): RequestHandler {
  return async (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== "string" || typeof password !== "string") {
      res.status(400).json({ error: "email and password are required" });
      return;
    }
    const credentials: LoginRequest = { email, password };

    const row = findUserByEmail(db, credentials.email.toLowerCase().trim());
    if (
      !row ||
      !(await bcrypt.compare(credentials.password, row.password_hash))
    ) {
      res.status(401).json({ error: "invalid email or password" });
      return;
    }

    const body: AuthResponse = {
      token: signToken(row.id),
      user: { id: row.id, email: row.email, createdAt: row.created_at },
    };
    res.json(body);
  };
}
