import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app.js";
import { createDb } from "../db/index.js";

const buildApp = (): Express => createApp(createDb(":memory:"));

const RYAN_EMAIL = "ryan@example.com";
const GRACE_EMAIL = "grace@example.com";
const CAROL_EMAIL = "carol@example.com";

async function registerTestUser(app: Express, email: string): Promise<string> {
  const res = await request(app)
    .post("/auth/register")
    .send({ email, password: "password123" });
  return res.body.token;
}

describe("teams", () => {
  it("creates a team and lists it for the owner only", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);

    const created = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ name: "Platform" });
    expect(created.status).toBe(201);
    expect(created.body.role).toBe("owner");

    const mine = await request(app)
      .get("/teams")
      .set("Authorization", `Bearer ${ryanToken}`);
    expect(mine.body).toEqual([created.body]);

    const theirs = await request(app)
      .get("/teams")
      .set("Authorization", `Bearer ${graceToken}`);
    expect(theirs.body).toEqual([]);
  });

  it("returns a team to its members, 404 to everyone else", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);

    const created = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ name: "Platform" });

    const asMember = await request(app)
      .get(`/teams/${created.body.id}`)
      .set("Authorization", `Bearer ${ryanToken}`);
    expect(asMember.status).toBe(200);
    expect(asMember.body).toEqual(created.body);

    const asOther = await request(app)
      .get(`/teams/${created.body.id}`)
      .set("Authorization", `Bearer ${graceToken}`);
    expect(asOther.status).toBe(404);
  });

  it("lets the owner add an existing user, but not non-owner members", async () => {
    const app = buildApp();
    const ryanToken = await registerTestUser(app, RYAN_EMAIL);
    const graceToken = await registerTestUser(app, GRACE_EMAIL);
    await registerTestUser(app, CAROL_EMAIL);

    const team = await request(app)
      .post("/teams")
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ name: "Platform" });

    const added = await request(app)
      .post(`/teams/${team.body.id}/members`)
      .set("Authorization", `Bearer ${ryanToken}`)
      .send({ email: GRACE_EMAIL });
    expect(added.status).toBe(201);
    expect(added.body).toEqual({
      id: expect.any(String),
      email: GRACE_EMAIL,
      role: "member",
    });

    // grace is now a member but not the owner, so she can't add anyone
    const denied = await request(app)
      .post(`/teams/${team.body.id}/members`)
      .set("Authorization", `Bearer ${graceToken}`)
      .send({ email: CAROL_EMAIL });
    expect(denied.status).toBe(403);
  });

  it("lists a team's members to members, 404 to non-members", async () => {
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

    // grace is a member (not owner) and can still see the roster
    const members = await request(app)
      .get(`/teams/${team.body.id}/members`)
      .set("Authorization", `Bearer ${graceToken}`);
    expect(members.status).toBe(200);
    const roleByEmail = Object.fromEntries(
      members.body.map((m: { email: string; role: string }) => [
        m.email,
        m.role,
      ]),
    );
    expect(roleByEmail).toEqual({
      [RYAN_EMAIL]: "owner",
      [GRACE_EMAIL]: "member",
    });

    const denied = await request(app)
      .get(`/teams/${team.body.id}/members`)
      .set("Authorization", `Bearer ${carolToken}`);
    expect(denied.status).toBe(404);
  });

  it("requires authentication", async () => {
    const res = await request(buildApp()).post("/teams").send({ name: "Nope" });
    expect(res.status).toBe(401);
  });
});
