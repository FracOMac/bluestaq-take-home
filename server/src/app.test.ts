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
