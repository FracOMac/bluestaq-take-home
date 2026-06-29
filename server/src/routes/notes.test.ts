import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app.js";
import { createDb } from "../db.js";

const buildApp = (): Express => createApp(createDb(":memory:"));

const RYAN_EMAIL = "ryan@example.com";
const GRACE_EMAIL = "grace@example.com"
const CAROL_EMAIL = "carol@example.com"

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

  it("creates a team note for a team you're in, but not one you're not", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);
    const team = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ name: "Platform" });

    const created = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "Shared", visibility: "team", teamId: team.body.id });
    expect(created.status).toBe(201);
    expect(created.body.visibility).toBe("team");
    expect(created.body.teamId).toBe(team.body.id);

    // grace isn't a member of ryan's team
    const denied = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${graceToken}`)
      .send({ title: "Sneaky", visibility: "team", teamId: team.body.id });
    expect(denied.status).toBe(403);
  });

  it("shares a team note with team members for reading, not with outsiders", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);
    const carolToken = await registerTestUser(app, CAROL_EMAIL);

    const team = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ name: "Platform" });
    await request(app)
      .post(`/teams/${team.body.id}/members`)
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ email: GRACE_EMAIL });

    const note = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "Shared", visibility: "team", teamId: team.body.id });

    // grace is a member: sees it in the list and can fetch it by id
    const graceList = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${graceToken}`);
    expect(graceList.body.map((n: { id: string }) => n.id)).toContain(note.body.id);
    const graceGet = await request(app)
      .get(`/notes/${note.body.id}`)
      .set("Authorization", `Bearer ${graceToken}`);
    expect(graceGet.status).toBe(200);

    // carol is not a member: doesn't see it and gets 404 by id
    const carolList = await request(app)
      .get("/notes")
      .set("Authorization", `Bearer ${carolToken}`);
    expect(carolList.body).toHaveLength(0);
    const carolGet = await request(app)
      .get(`/notes/${note.body.id}`)
      .set("Authorization", `Bearer ${carolToken}`);
    expect(carolGet.status).toBe(404);
  });

  it("lets the owner change a note's visibility to a team and back", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const team = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ name: "Platform" });

    const note = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "Note" });
    expect(note.body.visibility).toBe("private");

    const toTeam = await request(app)
      .patch(`/notes/${note.body.id}`)
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ visibility: "team", teamId: team.body.id });
    expect(toTeam.status).toBe(200);
    expect(toTeam.body.visibility).toBe("team");
    expect(toTeam.body.teamId).toBe(team.body.id);

    const toPrivate = await request(app)
      .patch(`/notes/${note.body.id}`)
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ visibility: "private" });
    expect(toPrivate.body.visibility).toBe("private");
    expect(toPrivate.body.teamId).toBeNull();
  });

  it("lets a team member edit a team note, but not change its visibility", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);
    const team = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ name: "Platform" });
    await request(app)
      .post(`/teams/${team.body.id}/members`)
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ email: GRACE_EMAIL });
    const note = await request(app)
      .post("/notes")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ title: "Shared", content: "v1", visibility: "team", teamId: team.body.id });

    // grace is a member (not owner): can edit the content
    const edit = await request(app)
      .patch(`/notes/${note.body.id}`)
      .set("Authorization", `Bearer ${graceToken}`)
      .send({ content: "v2 by grace" });
    expect(edit.status).toBe(200);
    expect(edit.body.content).toBe("v2 by grace");

    // but cannot flip its visibility
    const flip = await request(app)
      .patch(`/notes/${note.body.id}`)
      .set("Authorization", `Bearer ${graceToken}`)
      .send({ visibility: "private" });
    expect(flip.status).toBe(403);
  });

  it("requires authentication", async () => {
    const res = await request(buildApp()).get("/notes");
    expect(res.status).toBe(401);
  });
});
