import { useEffect, useState } from "react";
import { api } from "../api";
import type { NavState } from "../App";
import type { Attachment, ChangeNotice, User } from "../types";

const initial = {
  recipient: "Ban Giám đốc sản xuất",
  proposerName: "",
  proposerDepartment: "Phòng NCPT / R&D",
  workshopType: "NON_STERILE",
  productName: "",
  manufacturingProcessCode: "",
  issuedDate: new Date().toISOString().slice(0, 10),
  notificationIssueNumber: "Lần 1",
  title: "",
  changeType: "Thay đổi quy trình pha chế",
  impactLevel: "Trung bình",
  changeContent: "",
  effectiveNote: "Phiếu thông báo này có hiệu lực kể từ ngày ký và là bản không thể tách rời dự thảo quy trình pha chế gốc."
};

type FormState = typeof initial;

export function NoticeFormPage({ id, user, navigate }: { id?: string; user: User; navigate: (nav: NavState) => void }) {
  const [form, setForm] = useState(initial);
  const [notice, setNotice] = useState<ChangeNotice | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState("");
  const isEditing = Boolean(id);

  useEffect(() => {
    if (!id) return;
    api<{ notice: ChangeNotice }>(`/api/notices/${id}`)
      .then((res) => {
        setNotice(res.notice);
        setFiles(res.notice.attachments);
        setForm({
          recipient: res.notice.recipient,
          proposerName: res.notice.proposerName,
          proposerDepartment: res.notice.proposerDepartment,
          workshopType: res.notice.workshopType,
          productName: res.notice.productName,
          manufacturingProcessCode: res.notice.manufacturingProcessCode,
          issuedDate: res.notice.issuedDate.slice(0, 10),
          notificationIssueNumber: res.notice.notificationIssueNumber,
          title: res.notice.title,
          changeType: res.notice.changeType,
          impactLevel: res.notice.impactLevel,
          changeContent: res.notice.changeContent,
          effectiveNote: res.notice.effectiveNote
        });
      })
      .catch((err) => setError(err.message));
  }, [id]);

  useEffect(() => {
    if (id) return;
    if (user.workshopType === "STERILE" || user.workshopType === "NON_STERILE") {
      setForm((current) => ({ ...current, workshopType: user.workshopType }));
    }
  }, [id, user.workshopType]);

  function update(name: keyof FormState, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const res = await api<{ notice: ChangeNotice }>(isEditing ? `/api/notices/${id}` : "/api/notices", {
        method: isEditing ? "PUT" : "POST",
        body: JSON.stringify(form)
      });
      setNotice(res.notice);
      setFiles(res.notice.attachments || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không lưu được TBTĐ.");
    }
  }

  async function upload(fileList: FileList | null) {
    if (!notice || !fileList?.length) return;
    setError("");
    const formData = new FormData();
    formData.append("file", fileList[0]);
    formData.append("category", "Tài liệu hỗ trợ");
    try {
      const res = await api<{ attachment: Attachment }>(`/api/notices/${notice.id}/attachments`, {
        method: "POST",
        body: formData
      });
      setFiles((current) => [res.attachment, ...current]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không đính kèm được tài liệu.");
    }
  }

  async function submitNotice() {
    if (!notice) return;
    const res = await api<{ notice: ChangeNotice }>(`/api/notices/${notice.id}/submit`, { method: "POST" });
    navigate({ page: "detail", id: res.notice.id });
  }

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>{isEditing ? "Sửa phiếu thông báo thay đổi" : "Tạo thông báo thay đổi"}</h1>
          <p>
            {isEditing
              ? "Sửa phiếu đang triển khai hoặc bị trả về. Phiếu đã phê duyệt phải tạo bản sửa đổi."
              : "Nhập thông tin theo phiếu Change Notice hiện đang sử dụng."}
          </p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <form className="form-grid" onSubmit={save}>
        {Object.entries(form).map(([key, value]) => (
          <label key={key} className={key === "changeContent" || key === "effectiveNote" ? "wide" : ""}>
            {labelFor(key)}
            {key === "workshopType" ? (
              <select value={value} disabled={user.workshopType !== "ALL"} onChange={(event) => update(key as keyof FormState, event.target.value)}>
                <option value="STERILE">Xưởng vô trùng</option>
                <option value="NON_STERILE">Xưởng không vô trùng</option>
              </select>
            ) : key === "changeContent" || key === "effectiveNote" ? (
              <textarea value={value} onChange={(event) => update(key as keyof FormState, event.target.value)} rows={5} />
            ) : (
              <input type={key === "issuedDate" ? "date" : "text"} value={value} onChange={(event) => update(key as keyof FormState, event.target.value)} />
            )}
          </label>
        ))}
        <section className="wide attachment-upload-panel">
          <h2>Đính kèm tài liệu</h2>
          {notice ? (
            <>
              <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => upload(event.target.files)} />
              <p className="hint">Sau khi tải lên, mở trang chi tiết để xem trước PDF/DOCX, in file gốc và ghi chú trực tiếp trên tài liệu.</p>
              <ul>
                {files.map((file) => <li key={file.id}>{file.fileName} - {Math.round(file.size / 1024)} KB</li>)}
              </ul>
            </>
          ) : (
            <p className="hint">Lưu bản nháp trước, sau đó app sẽ cho phép đính kèm tài liệu vào phiếu này.</p>
          )}
        </section>
        <div className="wide actions">
          <button type="submit">{isEditing ? "Lưu thay đổi" : "Lưu bản nháp"}</button>
          {notice && <button type="button" onClick={submitNotice}>Gửi đi</button>}
          {notice && <button type="button" onClick={() => navigate({ page: "detail", id: notice.id })}>Xem chi tiết</button>}
        </div>
      </form>
    </div>
  );
}

function labelFor(key: string) {
  const labels: Record<string, string> = {
    recipient: "Kính gửi / To",
    proposerName: "Người đề nghị / Proponent",
    proposerDepartment: "Bộ phận / Dept",
    workshopType: "Loại xưởng",
    productName: "Tên sản phẩm / Product name",
    manufacturingProcessCode: "Mã quy trình / Manufacturing process code",
    issuedDate: "Ngày ban hành / Issued date",
    notificationIssueNumber: "Lần ban hành phiếu",
    title: "Tiêu đề / Tóm tắt",
    changeType: "Loại thay đổi",
    impactLevel: "Mức tác động",
    changeContent: "Nội dung thay đổi / Content",
    effectiveNote: "Ghi chú hiệu lực"
  };
  return labels[key] || key;
}
