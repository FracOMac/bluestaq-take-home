import { describe, it, expect } from "vitest";
import request from "supertest";
import type { Express } from "express";
import { createApp } from "../app.js";
import { createDb } from "../db.js";

const buildApp = (): Express => createApp(createDb(":memory:"));
const creds = { email: "ryan@example.com", password: "password123" };

describe("auth", () => {
  it("registers a user and returns a token", async () => {
    const res = await request(buildApp()).post("/auth/register").send(creds);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe("ryan@example.com");
  });

  it("logs in with valid credentials", async () => {
    const app = buildApp();
    await request(app).post("/auth/register").send(creds);

    const res = await request(app).post("/auth/login").send(creds);
    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
  });

  it("rejects a wrong password", async () => {
    const app = buildApp();
    await request(app).post("/auth/register").send(creds);

    const res = await request(app)
      .post("/auth/login")
      .send({ ...creds, password: "wrongpassword" });
    expect(res.status).toBe(401);
  });
});
