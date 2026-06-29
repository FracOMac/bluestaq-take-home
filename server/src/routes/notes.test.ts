import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app.js";
import { createDb } from "../db.js";

const buildApp = (): Express => createApp(createDb(":memory:"));

const RYAN_EMAIL = "ryan@example.com";
const GRACE_EMAIL = "grace@example.com"

async function registerTestUser(app: Express, email: string): Promise<string> {
  const res = await request(app)
    .post("/auth/register")
    .send({ email, password: "password123" });
  return res.body.token;
}

describe("notes", () => {
  it("creates a note for the caller and lists only their own", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);

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

  it("fetches a note by id for its owner, but 404s for anyone else", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "secret" });
    const id = created.body.id;

    const asOwner = await request(app)
      .get(`/notes/${id}`)
      .set("Authorization", `Bearer ${ryanToken}`);
    expect(asOwner.status).toBe(200);
    expect(asOwner.body.id).toBe(id);

    const asOther = await request(app)
      .get(`/notes/${id}`)
      .set("Authorization", `Bearer ${graceToken}`);
    expect(asOther.status).toBe(404);
  });

  it("updates a note owned by the caller", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "draft", content: "v1" });

    const updated = await request(app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "final", content: "v2" });
    expect(updated.status).toBe(200);
    expect(updated.body.title).toBe("final");
    expect(updated.body.content).toBe("v2");
  });

  it("404s when updating a note the caller doesn't own", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "ryan's note" });

    const res = await request(app)
      .patch(`/notes/${created.body.id}`)
      .set("Authorization", `Bearer ${graceToken}`)
      .send({ title: "hijacked" });
    expect(res.status).toBe(404);
  });

  it("deletes a note owned by the caller", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "temp" });
    const id = created.body.id;

    const deleted = await request(app)
      .delete(`/notes/${id}`)
      .set("Authorization", `Bearer ${ryanToken}`);
    expect(deleted.status).toBe(204);

    const after = await request(app)
      .get(`/notes/${id}`)
      .set("Authorization", `Bearer ${ryanToken}`);
    expect(after.status).toBe(404);
  });

  it("404s when deleting a note the caller doesn't own", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "ryan's note" });
    const id = created.body.id;

    const deleted = await request(app)
      .delete(`/notes/${id}`)
      .set("Authorization", `Bearer ${graceToken}`);
    expect(deleted.status).toBe(404);

    // still there for its owner
    const stillThere = await request(app)
      .get(`/notes/${id}`)
      .set("Authorization", `Bearer ${ryanToken}`);
    expect(stillThere.status).toBe(200);
  });

  it("requires authentication", async () => {
    const res = await request(buildApp()).get("/notes");
    expect(res.status).toBe(401);
  });
});
