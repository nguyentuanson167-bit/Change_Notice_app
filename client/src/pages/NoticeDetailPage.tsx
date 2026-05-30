import { useEffect, useState } from "react";
import { api } from "../api";
import type { NavState } from "../App";
import type { Attachment, ChangeNotice, User } from "../types";

export function NoticeDetailPage({ id, user, navigate }: { id: string; user: User; navigate: (nav: NavState) => void }) {
  const [notice, setNotice] = useState<ChangeNotice | null>(null);
  const [returnReason, setReturnReason] = useState("");
  const [annotation, setAnnotation] = useState("");
  const [selectedAttachment, setSelectedAttachment] = useState<Attachment | null>(null);
  const [markerDraft, setMarkerDraft] = useState<{ x: number; y: number } | null>(null);
  const [error, setError] = useState("");

  async function load() {
    const res = await api<{ notice: ChangeNotice }>(`/api/notices/${id}`);
    setNotice(res.notice);
    setSelectedAttachment((current) => current ?? res.notice.attachments[0] ?? null);
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
      setError(err instanceof Error ? err.message : "Thao tác thất bại.");
    }
  }

  async function createRevision() {
    const reason = window.prompt("Nhập lý do tạo bản sửa đổi cho phiếu đã phê duyệt:");
    if (!reason?.trim()) return;
    const res = await api<{ notice: ChangeNotice }>(`/api/notices/${id}/revision`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    navigate({ page: "create", id: res.notice.id });
  }

  async function upload(fileList: FileList | null) {
    if (!notice || !fileList?.length) return;
    setError("");
    const formData = new FormData();
    formData.append("file", fileList[0]);
    formData.append("category", "Tài liệu hỗ trợ");
    try {
      await api(`/api/notices/${notice.id}/attachments`, { method: "POST", body: formData });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đính kèm được tài liệu.");
    }
  }

  async function addAnnotation() {
    if (!annotation.trim()) return;
    setError("");
    await api(`/api/notices/${id}/annotations`, {
      method: "POST",
      body: JSON.stringify({
        attachmentId: selectedAttachment?.id,
        type: selectedAttachment ? "FILE_MARK" : "GENERAL",
        pageNumber: selectedAttachment ? 1 : undefined,
        x: markerDraft?.x,
        y: markerDraft?.y,
        referenceText: markerDraft ? `Ghim tại X ${markerDraft.x}%, Y ${markerDraft.y}%` : undefined,
        content: annotation,
        severity: "REQUIRED"
      })
    });
    setAnnotation("");
    setMarkerDraft(null);
    await load();
  }

  function markOnPreview(event: React.MouseEvent<HTMLDivElement>) {
    if (!selectedAttachment) return;
    const rect = event.currentTarget.getBoundingClientRect();
    setMarkerDraft({
      x: Number((((event.clientX - rect.left) / rect.width) * 100).toFixed(2)),
      y: Number((((event.clientY - rect.top) / rect.height) * 100).toFixed(2))
    });
  }

  async function acknowledge(distributionId: string) {
    await api(`/api/distributions/${distributionId}/acknowledge`, { method: "POST" });
    await load();
  }

  if (!notice) return <div>{error || "Đang tải chi tiết..."}</div>;
  const canSubmit = ["DRAFT", "RETURNED", "RECALLED"].includes(notice.status) && notice.authorId === user.id;
  const canEdit = canSubmit || user.roles.includes("ADMIN");
  const canSign = notice.currentAssigneeRole && user.roles.includes(notice.currentAssigneeRole);
  const selectedAnnotations = selectedAttachment
    ? notice.annotations.filter((item) => item.attachmentId === selectedAttachment.id)
    : notice.annotations.filter((item) => !item.attachmentId);

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{notice.code}</h1>
          <p>{notice.title}</p>
        </div>
        <div className="actions">
          {canEdit && <button onClick={() => navigate({ page: "create", id })}>Sửa phiếu đang triển khai</button>}
          {["DISTRIBUTED", "APPROVED"].includes(notice.status) && <button onClick={createRevision}>Tạo bản sửa đổi</button>}
          <button onClick={() => navigate({ page: "print", id })}>In phiếu</button>
          <button onClick={() => navigate({ page: "browse" })}>Quay lại</button>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <section className="detail-grid">
        <div className="panel">
          <h2>Thông tin chung</h2>
          <Info label="Trạng thái" value={notice.status} />
          <Info label="Người đề nghị" value={`${notice.proposerName} - ${notice.proposerDepartment}`} />
          <Info label="Sản phẩm" value={notice.productName} />
          <Info label="Mã quy trình" value={notice.manufacturingProcessCode} />
          <Info label="Lần ban hành" value={notice.notificationIssueNumber} />
          <Info label="Loại thay đổi" value={notice.changeType} />
          <Info label="Mức tác động" value={notice.impactLevel} />
          <h3>Nội dung thay đổi</h3>
          <p className="preline">{notice.changeContent}</p>
        </div>
        <div className="panel">
          <h2>Thao tác</h2>
          {canSubmit && <button onClick={() => action("submit")}>Gửi đi</button>}
          {canSign && <button onClick={() => action("sign")}>Ký / Chuyển tiếp</button>}
          {canSign && (
            <div className="stack">
              <textarea value={returnReason} onChange={(event) => setReturnReason(event.target.value)} placeholder="Lý do trả về..." />
              <button onClick={() => action("return", { reason: returnReason })}>Trả về</button>
            </div>
          )}
          {!canSubmit && !canSign && <p>Không có thao tác cần xử lý cho tài khoản này.</p>}
        </div>
      </section>
      <section className="panel">
        <h2>Tài liệu đính kèm, xem trước và ghi chú trực tiếp</h2>
        {canEdit && (
          <div className="inline-form">
            <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => upload(event.target.files)} />
          </div>
        )}
        {notice.attachments.length === 0 && <p>Chưa có file đính kèm.</p>}
        <div className="attachment-layout">
          <div>
            {notice.attachments.map((file) => (
              <button
                className={`attachment-row ${selectedAttachment?.id === file.id ? "active" : ""}`}
                key={file.id}
                onClick={() => {
                  setSelectedAttachment(file);
                  setMarkerDraft(null);
                }}
              >
                <span>{file.fileName}</span>
                <small>{file.category} - {Math.round(file.size / 1024)} KB - SHA256 {file.checksum.slice(0, 12)}...</small>
              </button>
            ))}
          </div>
          <AttachmentPreview
            attachment={selectedAttachment}
            annotations={notice.annotations}
            draft={markerDraft}
            onMark={markOnPreview}
          />
        </div>
      </section>
      <section className="panel">
        <h2>Ghi chú và đánh dấu</h2>
        {selectedAttachment && (
          <p className="hint">
            Đang ghi chú trên file: <strong>{selectedAttachment.fileName}</strong>. Bấm trực tiếp lên vùng xem trước để đặt ghim, sau đó nhập nội dung ghi chú.
          </p>
        )}
        <div className="inline-form">
          <input value={annotation} onChange={(event) => setAnnotation(event.target.value)} placeholder="Nhập ghi chú/hướng dẫn sửa..." />
          <button onClick={addAnnotation}>Thêm ghi chú</button>
        </div>
        {markerDraft && (
          <p className="hint">Ghim mới đang đặt tại X {markerDraft.x}%, Y {markerDraft.y}%. Nhập nội dung rồi bấm Thêm ghi chú.</p>
        )}
        {selectedAttachment && (
          <h3>Ghi chú trên file đang chọn</h3>
        )}
        {selectedAnnotations.length === 0 && <p className="hint">Chưa có ghi chú cho tài liệu đang chọn.</p>}
        {selectedAnnotations.map((item) => {
          const markerNumber = typeof item.x === "number" && typeof item.y === "number"
            ? selectedAnnotations.filter((candidate) => typeof candidate.x === "number" && typeof candidate.y === "number").findIndex((candidate) => candidate.id === item.id) + 1
            : null;
          return (
            <div className="note" key={item.id}>
              <strong>
                {markerNumber ? `Ghim ${markerNumber}` : "Ghi chú"}
                {" · "}{item.severity} - {item.status}
              </strong>
              <p>{item.content}</p>
              {markerNumber && (
                <small>Vị trí: X {item.x}%, Y {item.y}%</small>
              )}
              <small>{item.creator?.name} - {new Date(item.createdAt).toLocaleString("vi-VN")}</small>
            </div>
          );
        })}
        {!selectedAttachment && notice.annotations.filter((item) => item.attachmentId).length > 0 && (
          <p className="hint">Chọn một tài liệu đính kèm để xem các ghi chú gắn trực tiếp với file đó.</p>
        )}
      </section>
      <section className="panel">
          <h2>Lượt ký</h2>
        <div className="timeline">
          {notice.workflowSteps.map((step) => (
            <div key={step.id}>
              <strong>{step.action}</strong> - {step.requiredRole}
              <span>{step.signer?.name || "Hệ thống"} - {new Date(step.createdAt).toLocaleString("vi-VN")}</span>
              {step.returnReason && <p>Lý do: {step.returnReason}</p>}
            </div>
          ))}
        </div>
      </section>
      <section className="panel">
        <h2>Phân phối</h2>
        {notice.distributions.map((item) => (
          <div className="distribution-row" key={item.id}>
            <span>{item.versionLabel}</span>
            <strong>{item.receivingUnit}</strong>
            <em>{item.status}</em>
            {item.status !== "ACKNOWLEDGED" && <button onClick={() => acknowledge(item.id)}>Đã nhận / Đã đọc</button>}
          </div>
        ))}
      </section>
      <section className="panel">
        <h2>Audit trail</h2>
        {notice.auditLogs.map((log) => (
          <div className="audit" key={log.id}>
            <strong>{log.action}</strong> {log.entity} - {log.actor?.name || "Hệ thống"}
            <span>{new Date(log.createdAt).toLocaleString("vi-VN")}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

function AttachmentPreview({
  attachment,
  annotations,
  draft,
  onMark
}: {
  attachment: Attachment | null;
  annotations: ChangeNotice["annotations"];
  draft: { x: number; y: number } | null;
  onMark: (event: React.MouseEvent<HTMLDivElement>) => void;
}) {
  const [docHtml, setDocHtml] = useState("");
  const [docStatus, setDocStatus] = useState("");
  const url = attachment ? `/uploads/${attachment.path}` : "";
  const fileName = attachment?.fileName.toLowerCase() ?? "";
  const isPdf = Boolean(attachment && (fileName.endsWith(".pdf") || attachment.mimeType.includes("pdf")));
  const isDocx = Boolean(attachment && (fileName.endsWith(".docx") || attachment.mimeType.includes("wordprocessingml")));
  const marks = attachment
    ? annotations.filter((item) => item.attachmentId === attachment.id && typeof item.x === "number" && typeof item.y === "number")
    : [];

  useEffect(() => {
    let cancelled = false;
    setDocHtml("");
    setDocStatus("");

    if (!attachment || !isDocx) return;

    setDocStatus("Đang dựng preview DOCX...");
    fetch(url)
      .then(async (response) => {
        if (!response.ok) throw new Error("Không tải được file DOCX.");
        const arrayBuffer = await response.arrayBuffer();
        const mammoth = (await import("mammoth")).default;
        return mammoth.convertToHtml({ arrayBuffer }, { convertImage: mammoth.images.dataUri });
      })
      .then((result) => {
        if (cancelled) return;
        setDocHtml(result.value || "<p>Tài liệu không có nội dung đọc được.</p>");
        setDocStatus(result.messages.length ? "Preview DOCX có thể khác nhẹ so với Word gốc." : "");
      })
      .catch((err) => {
        if (!cancelled) setDocStatus(err instanceof Error ? err.message : "Không preview được file DOCX.");
      });

    return () => {
      cancelled = true;
    };
  }, [attachment, isDocx, url]);

  if (!attachment) {
    return <div className="attachment-preview empty">Chọn một tài liệu để xem trước.</div>;
  }

  return (
    <div className="attachment-preview">
      <div className="preview-toolbar">
        <strong>Xem trước: {attachment.fileName}</strong>
        <a href={url} target="_blank" rel="noreferrer">Mở/In file gốc</a>
      </div>
      {isPdf ? (
        <div className="pdf-preview">
          <iframe src={`${url}#toolbar=1&navpanes=0&view=FitH`} title={attachment.fileName} />
          <div className="annotation-layer" onClick={onMark}>
            {marks.map((mark, index) => (
              <span
                key={mark.id}
                className="annotation-pin"
                style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                title={mark.content}
              >
                {index + 1}
              </span>
            ))}
            {draft && <span className="annotation-pin draft" style={{ left: `${draft.x}%`, top: `${draft.y}%` }}>+</span>}
          </div>
        </div>
      ) : isDocx ? (
        <div className="docx-preview" onClick={onMark}>
          {docStatus && <p className="hint">{docStatus}</p>}
          <div className="docx-page" dangerouslySetInnerHTML={{ __html: docHtml }} />
          <div className="annotation-layer">
            {marks.map((mark, index) => (
              <span
                key={mark.id}
                className="annotation-pin"
                style={{ left: `${mark.x}%`, top: `${mark.y}%` }}
                title={mark.content}
              >
                {index + 1}
              </span>
            ))}
            {draft && <span className="annotation-pin draft" style={{ left: `${draft.x}%`, top: `${draft.y}%` }}>+</span>}
          </div>
        </div>
      ) : (
        <div className="word-preview">
          <p>File .doc cũ chưa preview trực tiếp ổn định trên trình duyệt. Hãy mở file gốc để xem/in; nếu cần preview web, lưu lại thành .docx rồi tải lên.</p>
          <a href={url} target="_blank" rel="noreferrer">Tải hoặc mở tài liệu Word</a>
        </div>
      )}
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
