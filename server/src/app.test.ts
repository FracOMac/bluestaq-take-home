import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";
import { createDb } from "./db.js";

function buildApp() {
  return createApp(createDb(":memory:"));
}

describe("health", () => {
  it("returns ok", async () => {
    const res = await request(buildApp()).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });
});

describe("POST /auth/register", () => {
  it("creates a user and returns a token and the user", async () => {
    const res = await request(buildApp())
      .post("/auth/register")
      .send({ email: "ada@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.id).toBeTypeOf("string");
    expect(res.body.user.email).toBe("ada@example.com");
    // never leak the password
    expect(JSON.stringify(res.body)).not.toContain("password123");
  });
});

describe("POST /auth/login", () => {
  const creds = { email: "ada@example.com", password: "password123" };

  it("returns a token and user for valid credentials", async () => {
    const app = buildApp();
    await request(app).post("/auth/register").send(creds);

    const res = await request(app).post("/auth/login").send(creds);

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTypeOf("string");
    expect(res.body.user.email).toBe("ada@example.com");
  });

  it("rejects a wrong password with 401", async () => {
    const app = buildApp();
    await request(app).post("/auth/register").send(creds);

    const res = await request(app)
      .post("/auth/login")
      .send({ email: creds.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("rejects an unknown email with 401", async () => {
    const res = await request(buildApp())
      .post("/auth/login")
      .send({ email: "nobody@example.com", password: "password123" });

    expect(res.status).toBe(401);
  });
});
