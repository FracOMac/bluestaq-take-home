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
  it("creates a user and returns it", async () => {
    const res = await request(buildApp())
      .post("/auth/register")
      .send({ email: "ada@example.com", password: "password123" });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeTypeOf("string");
    expect(res.body.email).toBe("ada@example.com");
    // never leak the password
    expect(JSON.stringify(res.body)).not.toContain("password123");
  });
});
