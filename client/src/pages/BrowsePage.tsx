import { useEffect, useState } from "react";
import { api } from "../api";
import type { NavState } from "../App";
import type { ChangeNotice } from "../types";

const views = [
  ["", "Tat ca"],
  ["in-progress", "Dang thuc hien"],
  ["my-queue", "Cho toi xu ly"],
  ["approved", "Da phe duyet"],
  ["distributed", "Da phan phoi"],
  ["superseded", "Da thay the"],
  ["open-annotations", "Co ghi chu mo"]
];

export function BrowsePage({ navigate, defaultView }: { navigate: (nav: NavState) => void; defaultView?: string }) {
  const [view, setView] = useState(defaultView || "");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [notices, setNotices] = useState<ChangeNotice[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams();
    if (view) params.set("view", view);
    if (q) params.set("q", q);
    if (status) params.set("status", status);
    api<{ notices: ChangeNotice[] }>(`/api/notices?${params}`)
      .then((res) => setNotices(res.notices))
      .catch((err) => setError(err.message));
  }, [view, q, status]);

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Tra cuu TBTD</h1>
          <p>Tim va thao tac nhanh voi thong bao dang thuc hien va da phe duyet.</p>
        </div>
        <button onClick={() => navigate({ page: "create" })}>Tao moi</button>
      </div>
      <div className="tabs">
        {views.map(([value, label]) => (
          <button key={value} className={view === value ? "active" : ""} onClick={() => setView(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="filters">
        <input placeholder="Tim ma, tieu de, san pham, ma quy trinh..." value={q} onChange={(event) => setQ(event.target.value)} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Tat ca trang thai</option>
          <option value="DRAFT">Nhap</option>
          <option value="RETURNED">Bi tra ve</option>
          <option value="PENDING_NCPT_LEAD">Cho NCPT ky</option>
          <option value="PENDING_QA_DEPUTY">Cho Pho DBCL</option>
          <option value="PENDING_QA_HEAD">Cho TP DBCL</option>
          <option value="PENDING_PROD_DIRECTOR">Cho GDSX</option>
          <option value="DISTRIBUTED">Da phan phoi</option>
          <option value="SUPERSEDED">Da thay the</option>
        </select>
        <button onClick={() => { setQ(""); setStatus(""); setView(""); }}>Xoa loc</button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ma</th>
              <th>Tieu de</th>
              <th>San pham / Ma quy trinh</th>
              <th>Trang thai</th>
              <th>Nguoi de nghi</th>
              <th>Ghi chu mo</th>
              <th>Phan phoi</th>
              <th>Thao tac</th>
            </tr>
          </thead>
          <tbody>
            {notices.map((notice) => (
              <tr key={notice.id}>
                <td>{notice.code}</td>
                <td>{notice.title}</td>
                <td>{notice.productName}<br /><small>{notice.manufacturingProcessCode}</small></td>
                <td><span className={`badge ${notice.status.toLowerCase()}`}>{notice.status}</span></td>
                <td>{notice.proposerName}<br /><small>{notice.proposerDepartment}</small></td>
                <td>{notice.annotations.filter((item) => item.status === "OPEN").length}</td>
                <td>{notice.distributions.filter((item) => item.status === "ACKNOWLEDGED").length}/{notice.distributions.length}</td>
                <td className="row-actions">
                  <button onClick={() => navigate({ page: "detail", id: notice.id })}>Chi tiet</button>
                  <button onClick={() => navigate({ page: "print", id: notice.id })}>In phieu</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
