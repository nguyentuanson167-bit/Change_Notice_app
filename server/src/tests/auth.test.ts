import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

describe("auth", () => {
  it("logs in seeded users", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "author", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.user.username).toBe("author");
    expect(res.body.user.roles).toContain("AUTHOR");
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "author", password: "wrong" });

    expect(res.status).toBe(401);
  });
});
