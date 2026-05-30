import request from "supertest";
import { describe, expect, it } from "vitest";
import { app } from "../app.js";

async function login(username: string) {
  const agent = request.agent(app);
  const res = await agent.post("/api/auth/login").send({ username, password: "password123" });
  expect(res.status).toBe(200);
  return agent;
}

function noticePayload(suffix: string) {
  return {
    title: `Thong bao test ${suffix}`,
    recipient: "Ban Giam doc san xuat",
    proposerName: "Nguyen Van Anh",
    proposerDepartment: "Phong NCPT / R&D",
    productName: `San pham ${suffix}`,
    manufacturingProcessCode: `QT-${suffix}`,
    issuedDate: "2026-05-30",
    notificationIssueNumber: "Lan 1",
    changeType: "Thay doi quy trinh pha che",
    impactLevel: "Trung binh",
    changeContent: "Noi dung thay doi phuc vu test workflow.",
    effectiveNote: "Co hieu luc tu ngay ky."
  };
}

describe("workflow", () => {
  it("submits and advances through signatures", async () => {
    const author = await login("author");
    const create = await author.post("/api/notices").send(noticePayload(String(Date.now())));
    expect(create.status).toBe(201);
    const id = create.body.notice.id;

    const submit = await author.post(`/api/notices/${id}/submit`).send();
    expect(submit.status).toBe(200);
    expect(submit.body.notice.status).toBe("PENDING_NCPT_LEAD");

    const wrong = await author.post(`/api/notices/${id}/sign`).send();
    expect(wrong.status).toBe(403);

    const lead = await login("lead");
    const signed = await lead.post(`/api/notices/${id}/sign`).send();
    expect(signed.status).toBe(200);
    expect(signed.body.notice.status).toBe("PENDING_QA_DEPUTY");
  });

  it("requires a return reason", async () => {
    const author = await login("author");
    const create = await author.post("/api/notices").send(noticePayload(`return-${Date.now()}`));
    const id = create.body.notice.id;
    await author.post(`/api/notices/${id}/submit`).send();

    const lead = await login("lead");
    const returned = await lead.post(`/api/notices/${id}/return`).send({ reason: "" });
    expect(returned.status).toBe(400);
  });

  it("final signature creates distribution rows", async () => {
    const author = await login("author");
    const create = await author.post("/api/notices").send(noticePayload(`final-${Date.now()}`));
    const id = create.body.notice.id;
    await author.post(`/api/notices/${id}/submit`).send();
    await (await login("lead")).post(`/api/notices/${id}/sign`).send();
    await (await login("qa-deputy")).post(`/api/notices/${id}/sign`).send();
    await (await login("qa-head")).post(`/api/notices/${id}/sign`).send();
    const approved = await (await login("director")).post(`/api/notices/${id}/sign`).send();
    expect(approved.status).toBe(200);
    expect(approved.body.notice.status).toBe("DISTRIBUTED");
    expect(approved.body.notice.distributions.length).toBeGreaterThanOrEqual(3);
  });

  it("scopes NCPT lead signing by workshop and allows NCPT head substitute", async () => {
    const sterileAuthor = await login("author2");
    const createSterile = await sterileAuthor.post("/api/notices").send({
      ...noticePayload(`sterile-${Date.now()}`),
      workshopType: "STERILE"
    });
    const sterileId = createSterile.body.notice.id;
    await sterileAuthor.post(`/api/notices/${sterileId}/submit`).send();

    const nonSterileLead = await login("lead");
    const wrongLead = await nonSterileLead.post(`/api/notices/${sterileId}/sign`).send();
    expect(wrongLead.status).toBe(403);

    const sterileLead = await login("lead-sterile");
    const sterileSigned = await sterileLead.post(`/api/notices/${sterileId}/sign`).send();
    expect(sterileSigned.status).toBe(200);
    expect(sterileSigned.body.notice.status).toBe("PENDING_QA_DEPUTY");

    const nonSterileAuthor = await login("author");
    const createNonSterile = await nonSterileAuthor.post("/api/notices").send({
      ...noticePayload(`head-${Date.now()}`),
      workshopType: "NON_STERILE"
    });
    const nonSterileId = createNonSterile.body.notice.id;
    await nonSterileAuthor.post(`/api/notices/${nonSterileId}/submit`).send();

    const ncptHead = await login("ncpt-head");
    const headSigned = await ncptHead.post(`/api/notices/${nonSterileId}/sign`).send();
    expect(headSigned.status).toBe(200);
    expect(headSigned.body.notice.status).toBe("PENDING_QA_DEPUTY");
  });

  it("scopes NCPT lead return action by workshop", async () => {
    const sterileAuthor = await login("author2");
    const createSterile = await sterileAuthor.post("/api/notices").send({
      ...noticePayload(`sterile-return-${Date.now()}`),
      workshopType: "STERILE"
    });
    const sterileId = createSterile.body.notice.id;
    await sterileAuthor.post(`/api/notices/${sterileId}/submit`).send();

    const nonSterileLead = await login("lead");
    const wrongReturn = await nonSterileLead.post(`/api/notices/${sterileId}/return`).send({ reason: "Sai phạm vi xưởng" });
    expect(wrongReturn.status).toBe(403);

    const sterileLead = await login("lead-sterile");
    const returned = await sterileLead.post(`/api/notices/${sterileId}/return`).send({ reason: "Cần bổ sung nội dung thay đổi" });
    expect(returned.status).toBe(200);
    expect(returned.body.notice.status).toBe("RETURNED");
  });

  it("scopes research staff create edit and submit by dosage workshop", async () => {
    const nonSterileAuthor = await login("author");
    const wrongCreate = await nonSterileAuthor.post("/api/notices").send({
      ...noticePayload(`wrong-author-${Date.now()}`),
      workshopType: "STERILE"
    });
    expect(wrongCreate.status).toBe(403);

    const create = await nonSterileAuthor.post("/api/notices").send({
      ...noticePayload(`right-author-${Date.now()}`),
      workshopType: "NON_STERILE"
    });
    expect(create.status).toBe(201);
    const id = create.body.notice.id;

    const switchWorkshop = await nonSterileAuthor.put(`/api/notices/${id}`).send({ workshopType: "STERILE" });
    expect(switchWorkshop.status).toBe(403);

    const sterileAuthor = await login("author2");
    const wrongSubmit = await sterileAuthor.post(`/api/notices/${id}/submit`).send();
    expect(wrongSubmit.status).toBe(403);

    const submit = await nonSterileAuthor.post(`/api/notices/${id}/submit`).send();
    expect(submit.status).toBe(200);
  });
});
