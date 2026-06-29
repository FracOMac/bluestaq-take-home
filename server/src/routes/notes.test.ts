import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app.js";
import { createDb } from "../db.js";

const buildApp = (): Express => createApp(createDb(":memory:"));

async function tokenFor(app: Express, email = "ryan@example.com"): Promise<string> {
  const res = await request(app)
    .post("/auth/register")
    .send({ email, password: "password123" });
  return res.body.token;
}

describe("notes", () => {
  it("creates a note for the caller and lists only their own", async () => {
    const app = buildApp();
    const ryanToken = await tokenFor(app);
    const graceToken = await tokenFor(app, "grace@example.com");

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "First note", content: "hello" });
    expect(created.status).toBe(201);
    expect(created.body.title).toBe("First note");
    expect(created.body.ownerId).toBeTypeOf("string");

    const ryanNotes = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${ryanToken}`);
    expect(ryanNotes.body).toHaveLength(1);

    const graceNotes = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${graceToken}`);
    expect(graceNotes.body).toHaveLength(0);
  });

  it("requires authentication", async () => {
    const res = await request(buildApp()).get("/notes");
    expect(res.status).toBe(401);
  });
});
