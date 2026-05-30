import { useEffect, useState } from "react";
import { api } from "../api";
import type { NavState } from "../App";
import type { ChangeNotice } from "../types";

const views = [
  ["", "Tất cả"],
  ["in-progress", "Đang thực hiện"],
  ["my-queue", "Chờ tôi xử lý"],
  ["approved", "Đã phê duyệt"],
  ["distributed", "Đã phân phối"],
  ["superseded", "Đã thay thế"],
  ["open-annotations", "Có ghi chú mở"]
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
          <h1>Tra cứu TBTĐ</h1>
          <p>Tìm và thao tác nhanh với thông báo đang thực hiện và đã phê duyệt.</p>
        </div>
        <button onClick={() => navigate({ page: "create" })}>Tạo mới</button>
      </div>
      <div className="tabs">
        {views.map(([value, label]) => (
          <button key={value} className={view === value ? "active" : ""} onClick={() => setView(value)}>
            {label}
          </button>
        ))}
      </div>
      <div className="filters">
        <input placeholder="Tìm mã, tiêu đề, sản phẩm, mã quy trình..." value={q} onChange={(event) => setQ(event.target.value)} />
        <select value={status} onChange={(event) => setStatus(event.target.value)}>
          <option value="">Tất cả trạng thái</option>
          <option value="DRAFT">Nháp</option>
          <option value="RETURNED">Bị trả về</option>
          <option value="PENDING_NCPT_LEAD">Chờ NCPT ký</option>
          <option value="PENDING_QA_DEPUTY">Chờ Phó ĐBCL</option>
          <option value="PENDING_QA_HEAD">Chờ TP ĐBCL</option>
          <option value="PENDING_PROD_DIRECTOR">Chờ GĐSX</option>
          <option value="DISTRIBUTED">Đã phân phối</option>
          <option value="SUPERSEDED">Đã thay thế</option>
        </select>
        <button onClick={() => { setQ(""); setStatus(""); setView(""); }}>Xóa lọc</button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Mã</th>
              <th>Tiêu đề</th>
              <th>Sản phẩm / Mã quy trình</th>
              <th>Trạng thái</th>
              <th>Người đề nghị</th>
              <th>Ghi chú mở</th>
              <th>Phân phối</th>
              <th>Thao tác</th>
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
                  <button onClick={() => navigate({ page: "detail", id: notice.id })}>Chi tiết</button>
                  {["DRAFT", "RETURNED", "RECALLED"].includes(notice.status) && (
                    <button onClick={() => navigate({ page: "create", id: notice.id })}>Sửa</button>
                  )}
                  <button onClick={() => navigate({ page: "print", id: notice.id })}>In phiếu</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
