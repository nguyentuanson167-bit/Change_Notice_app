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
    expect(res.body.user.roles).toContain("AUTHOR_NON_STERILE");
  });

  it("rejects invalid credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ username: "author", password: "wrong" });

    expect(res.status).toBe(401);
  });

  it("allows admin to update account profile and roles", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/auth/login").send({ username: "admin", password: "password123" });
    expect(login.status).toBe(200);

    const suffix = Date.now();
    const create = await agent.post("/api/admin/users").send({
      username: `edit-user-${suffix}`,
      name: "Tai khoan test",
      email: `edit-user-${suffix}@vinphaco.local`,
      department: "Phong test",
      workshopType: "NON_STERILE",
      roles: ["VIEWER"]
    });
    expect(create.status).toBe(201);

    const update = await agent.put(`/api/admin/users/${create.body.user.id}`).send({
      username: `edited-user-${suffix}`,
      name: "Tai khoan da sua",
      email: `edited-user-${suffix}@vinphaco.local`,
      department: "Phong NCPT / R&D",
      workshopType: "STERILE",
      roles: ["AUTHOR_STERILE", "NCPT_LEAD_STERILE"]
    });
    expect(update.status).toBe(200);
    expect(update.body.user.name).toBe("Tai khoan da sua");
    expect(update.body.user.workshopType).toBe("STERILE");
    expect(update.body.user.roles.map((item: { role: { code: string } }) => item.role.code)).toEqual(
      expect.arrayContaining(["AUTHOR_STERILE", "NCPT_LEAD_STERILE"])
    );
  });
});
