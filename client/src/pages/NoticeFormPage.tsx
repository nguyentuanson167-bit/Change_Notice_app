import { useState } from "react";
import { api } from "../api";
import type { NavState } from "../App";
import type { Attachment, ChangeNotice } from "../types";

const initial = {
  recipient: "Ban Giam doc san xuat",
  proposerName: "",
  proposerDepartment: "Phong NCPT / R&D",
  productName: "",
  manufacturingProcessCode: "",
  issuedDate: new Date().toISOString().slice(0, 10),
  notificationIssueNumber: "Lan 1",
  title: "",
  changeType: "Thay doi quy trinh pha che",
  impactLevel: "Trung binh",
  changeContent: "",
  effectiveNote: "Phieu thong bao nay co hieu luc ke tu ngay ky va la ban khong the tach roi du thao quy trinh pha che goc."
};

export function NoticeFormPage({ navigate }: { navigate: (nav: NavState) => void }) {
  const [form, setForm] = useState(initial);
  const [notice, setNotice] = useState<ChangeNotice | null>(null);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [error, setError] = useState("");

  function update(name: string, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const res = await api<{ notice: ChangeNotice }>("/api/notices", {
        method: "POST",
        body: JSON.stringify(form)
      });
      setNotice(res.notice);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Khong luu duoc TBTD.");
    }
  }

  async function upload(fileList: FileList | null) {
    if (!notice || !fileList?.length) return;
    const formData = new FormData();
    formData.append("file", fileList[0]);
    formData.append("category", "Tai lieu ho tro");
    const res = await api<{ attachment: Attachment }>(`/api/notices/${notice.id}/attachments`, {
      method: "POST",
      body: formData
    });
    setFiles((current) => [res.attachment, ...current]);
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
          <h1>Tao thong bao thay doi</h1>
          <p>Nhap thong tin theo phieu Change Notice hien dang su dung.</p>
        </div>
      </div>
      {error && <div className="error">{error}</div>}
      <form className="form-grid" onSubmit={save}>
        {Object.entries(form).map(([key, value]) => (
          <label key={key} className={key === "changeContent" || key === "effectiveNote" ? "wide" : ""}>
            {labelFor(key)}
            {key === "changeContent" || key === "effectiveNote" ? (
              <textarea value={value} onChange={(event) => update(key, event.target.value)} rows={5} />
            ) : (
              <input type={key === "issuedDate" ? "date" : "text"} value={value} onChange={(event) => update(key, event.target.value)} />
            )}
          </label>
        ))}
        <div className="wide actions">
          <button type="submit">Luu ban nhap</button>
          {notice && <button type="button" onClick={submitNotice}>Gui di</button>}
        </div>
      </form>
      {notice && (
        <section className="panel">
          <h2>Dinh kem tai lieu</h2>
          <input type="file" accept=".pdf,.doc,.docx" onChange={(event) => upload(event.target.files)} />
          <ul>
            {files.map((file) => <li key={file.id}>{file.fileName} - {Math.round(file.size / 1024)} KB</li>)}
          </ul>
        </section>
      )}
    </div>
  );
}

function labelFor(key: string) {
  const labels: Record<string, string> = {
    recipient: "Kinh gui / To",
    proposerName: "Nguoi de nghi / Proponent",
    proposerDepartment: "Bo phan / Dept",
    productName: "Ten san pham / Product name",
    manufacturingProcessCode: "Ma quy trinh / Manufacturing process code",
    issuedDate: "Ngay ban hanh / Issued date",
    notificationIssueNumber: "Lan ban hanh phieu",
    title: "Tieu de / Tom tat",
    changeType: "Loai thay doi",
    impactLevel: "Muc tac dong",
    changeContent: "Noi dung thay doi / Content",
    effectiveNote: "Ghi chu hieu luc"
  };
  return labels[key] || key;
}
