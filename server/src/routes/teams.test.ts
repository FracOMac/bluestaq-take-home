import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app.js";
import { createDb } from "../db.js";

const buildApp = (): Express => createApp(createDb(":memory:"));

const RYAN_EMAIL = "ryan@example.com";
const GRACE_EMAIL = "grace@example.com";

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

  it("requires authentication", async () => {
    const res = await request(buildApp()).post("/teams").send({ name: "Nope" });
    expect(res.status).toBe(401);
  });
});
