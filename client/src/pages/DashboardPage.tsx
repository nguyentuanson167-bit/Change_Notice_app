import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import type { NavState } from "../App";
import type { ChangeNotice } from "../types";

export function DashboardPage({ navigate }: { navigate: (nav: NavState) => void }) {
  const [notices, setNotices] = useState<ChangeNotice[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api<{ notices: ChangeNotice[] }>("/api/notices")
      .then((res) => setNotices(res.notices))
      .catch((err) => setError(err.message));
  }, []);

  const counts = useMemo(() => {
    const inProgress = notices.filter((n) => ["DRAFT", "RETURNED", "RECALLED"].includes(n.status) || n.status.startsWith("PENDING")).length;
    return {
      total: notices.length,
      inProgress,
      queue: notices.filter((n) => n.currentAssigneeRole).length,
      approved: notices.filter((n) => ["APPROVED", "DISTRIBUTED"].includes(n.status)).length,
      annotations: notices.reduce((sum, n) => sum + n.annotations.filter((a) => a.status === "OPEN").length, 0),
      pendingAck: notices.reduce((sum, n) => sum + n.distributions.filter((d) => d.status !== "ACKNOWLEDGED").length, 0)
    };
  }, [notices]);

  return (
    <div>
      <div className="page-title">
        <div>
          <h1>Tong quan</h1>
          <p>Theo doi TBTD dang thuc hien, da duyet va phan phoi.</p>
        </div>
        <button onClick={() => navigate({ page: "create" })}>Tao TBTD moi</button>
      </div>
      {error && <div className="error">{error}</div>}
      <div className="metric-grid">
        <Metric label="Tat ca TBTD" value={counts.total} onClick={() => navigate({ page: "browse" })} />
        <Metric label="Dang thuc hien" value={counts.inProgress} onClick={() => navigate({ page: "browse", view: "in-progress" })} />
        <Metric label="Cho xu ly" value={counts.queue} onClick={() => navigate({ page: "browse", view: "my-queue" })} />
        <Metric label="Da phe duyet" value={counts.approved} onClick={() => navigate({ page: "browse", view: "approved" })} />
        <Metric label="Ghi chu mo" value={counts.annotations} onClick={() => navigate({ page: "browse", view: "open-annotations" })} />
        <Metric label="Chua xac nhan nhan" value={counts.pendingAck} onClick={() => navigate({ page: "browse", view: "distributed" })} />
      </div>
      <h2>Hoat dong gan day</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ma</th>
              <th>Tieu de</th>
              <th>Trang thai</th>
              <th>Cap nhat</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {notices.slice(0, 8).map((notice) => (
              <tr key={notice.id}>
                <td>{notice.code}</td>
                <td>{notice.title}</td>
                <td><span className={`badge ${notice.status.toLowerCase()}`}>{notice.status}</span></td>
                <td>{new Date(notice.updatedAt).toLocaleString("vi-VN")}</td>
                <td><button onClick={() => navigate({ page: "detail", id: notice.id })}>Mo</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value, onClick }: { label: string; value: number; onClick: () => void }) {
  return (
    <button className="metric" onClick={onClick}>
      <span>{label}</span>
      <strong>{value}</strong>
    </button>
  );
}
