import { useEffect, useState } from "react";
import { api } from "../api";
import type { NavState } from "../App";
import type { ChangeNotice, User } from "../types";

export function NoticeDetailPage({ id, user, navigate }: { id: string; user: User; navigate: (nav: NavState) => void }) {
  const [notice, setNotice] = useState<ChangeNotice | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await api<{ notice: ChangeNotice }>(`/api/notices/${id}`);
    setNotice(res.notice);
  }

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [id]);

  async function action(path: string, body?: unknown) {
    setError("");
    try {
      await api(`/api/notices/${id}/${path}`, {
        method: "POST",
        body: body ? JSON.stringify(body) : undefined
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Thao tac that bai.");
    }
  }

  async function addAnnotation() {
    if (!annotation.trim()) return;
    await api(`/api/notices/${id}/annotations`, {
      method: "POST",
      body: JSON.stringify({
        type: "GENERAL",
        content: annotation,
        severity: "REQUIRED"
      })
    });
    setAnnotation("");
    await load();
  }

  async function acknowledge(distributionId: string) {
    await api(`/api/distributions/${distributionId}/acknowledge`, { method: "POST" });
    await load();
  }

  if (!notice) return <div>{error || "Dang tai chi tiet..."}</div>;
  const canSubmit = ["DRAFT", "RETURNED", "RECALLED"].includes(notice.status) && notice.authorId === user.id;
  const canSign = notice.currentAssigneeRole && user.roles.includes(notice.currentAssigneeRole);

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{notice.code}</h1>
          <p>{notice.title}</p>
        </div>
        <div className="actions">
          <button onClick={() => navigate({ page: "print", id })}>In phieu</button>
          <button onClick={() => navigate({ page: "browse" })}>Quay lai</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="detail-grid">
        <div className="panel">
          <h2>Thong tin chung</h2>
          <Info label="Trang thai" value={notice.status} />
          <Info label="Nguoi de nghi" value={`${notice.proposerName} - ${notice.proposerDepartment}`} />
          <Info label="San pham" value={notice.productName} />
          <Info label="Ma quy trinh" value={notice.manufacturingProcessCode} />
          <Info label="Lan ban hanh" value={notice.notificationIssueNumber} />
          <Info label="Loai thay doi" value={notice.changeType} />
          <Info label="Muc tac dong" value={notice.impactLevel} />
          <h3>Noi dung thay doi</h3>
          <p className="preline">{notice.changeContent}</p>
        </div>
        <div className="panel">
          <h2>Thao tac</h2>
          {canSubmit && <button onClick={() => action("submit")}>Gui di</button>}
          {canSign && <button onClick={() => action("sign")}>Ky / Chuyen tiep</button>}
          {canSign && (
            <div className="stack">
              <textarea value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Ly do tra ve..." />
              <button onClick={() => action("return", { reason: returnReason })}>Tra ve</button>
            </div>
          )}
          {["DISTRIBUTED", "APPROVED"].includes(notice.status) && (
            <button onClick={() => action("revision", { reason: "Tao ban sua doi tu giao dien" })}>Tao revision</button>
          )}
          {!canSubmit && !canSign && <p>Khong co thao tac can xu ly cho tai khoan nay.</p>}
        </div>
      </section>
      <section className="panel">
        <h2>Tai lieu dinh kem</h2>
        {notice.attachments.length === 0 && <p>Chua co file dinh kem.</p>}
        {notice.attachments.map((file) => (
          <div className="attachment-row" key={file.id}>
            <span>{file.fileName}</span>
            <small>{file.category} - {Math.round(file.size / 1024)} KB - SHA256 {file.checksum.slice(0, 12)}...</small>
            <a href={`/uploads/${file.path}`} target="_blank" rel="noreferrer">Mo / In</a>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Ghi chu va danh dau</h2>
        <div className="inline-form">
          <input value={annotation} onChange={(event) => setAnnotation(event.target.value)} placeholder="Them ghi chu..." />
          <button onClick={addAnnotation}>Them</button>
        </div>
        {notice.annotations.map((item) => (
          <div className="note" key={item.id}>
            <strong>{item.severity} - {item.status}</strong>
            <p>{item.content}</p>
            <small>{item.creator?.name} - {new Date(item.createdAt).toLocaleString("vi-VN")}</small>
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Luot ky</h2>
        <div className="timeline">
          {notice.workflowSteps.map((step) => (
            <div key={step.id}>
              <strong>{step.action}</strong> - {step.requiredRole}
              <span>{step.signer?.name || "He thong"} - {new Date(step.createdAt).toLocaleString("vi-VN")}</span>
              {step.returnReason && <p>Ly do: {step.returnReason}</p>}
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Phan phoi</h2>
        {notice.distributions.map((item) => (
          <div className="distribution-row" key={item.id}>
            <span>{item.versionLabel}</span>
            <strong>{item.receivingUnit}</strong>
            <em>{item.status}</em>
            {item.status !== "ACKNOWLEDGED" && <button onClick={() => acknowledge(item.id)}>Da nhan / Da doc</button>}
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Audit trail</h2>
        {notice.auditLogs.map((log) => (
          <div className="audit" key={log.id}>
            <strong>{log.action}</strong> {log.entity} - {log.actor?.name || "He thong"}
            <span>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
