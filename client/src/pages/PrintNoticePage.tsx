import { useEffect, useState } from "react";
import { api } from "../api";
import type { NavState } from "../App";
import type { ChangeNotice, WorkflowStep } from "../types";

type PrintData = {
  notice: ChangeNotice;
  signatures: Record<string, WorkflowStep | undefined>;
  statusMarker?: string;
};

export function PrintNoticePage({ id, navigate }: { id: string; navigate: (nav: NavState) => void }) {
  const [data, setData] = useState<PrintData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api<PrintData>(`/api/notices/${id}/print-data`)
      .then(setData)
      .catch((err) => setError(err.message));
  }, [id]);

  if (!data) return <div>{error || "Đang tải bản in..."}</div>;
  const { notice, signatures } = data;

  return (
    <div>
      <div className="print-toolbar">
        <button onClick={() => navigate({ page: "detail", id })}>Quay lại</button>
        <button onClick={() => window.print()}>In phiếu</button>
      </div>
      <article className="print-page">
        {data.statusMarker && <div className="watermark">{data.statusMarker}</div>}
        <header className="print-header">
          <small>NCPT/BM/019</small>
          <h1>PHIẾU THÔNG BÁO THAY ĐỔI</h1>
          <h2>CHANGE NOTICE</h2>
          <p>(Về sự đổi nội dung trong dự thảo quy trình pha chế, dự thảo quy trình đóng gói)</p>
          <strong>NCPT</strong>
          <p>Date ngày {new Date(notice.issuedDate).toLocaleDateString("vi-VN")}</p>
        </header>
        <section className="print-lines">
          <p><b>Kính gửi/To:</b> {notice.recipient}</p>
          <p><b>Người đề nghị thay đổi/Proponent:</b> {notice.proposerName}</p>
          <p><b>Bộ phận/Dept:</b> {notice.proposerDepartment}</p>
          <h3>1. Thông tin sản phẩm / Product information</h3>
          <p><b>Tên sản phẩm/Product name:</b> {notice.productName}</p>
          <p><b>Mã QTPC/QĐG / Manufacturing process code:</b> {notice.manufacturingProcessCode}</p>
          <p><b>Ngày ban hành/Issued date:</b> {new Date(notice.issuedDate).toLocaleDateString("vi-VN")}</p>
          <p><b>Lần ban hành phiếu thông báo/Notification issuance number:</b> {notice.notificationIssueNumber}</p>
          <h3>2. Nội dung thay đổi / Changes</h3>
          <p className="preline">{notice.changeContent}</p>
          <p className="effect-note">{notice.effectiveNote}</p>
        </section>
        <section className="signature-grid">
          <Signature title="Người đề nghị" subtitle="Edited by / P. NCPT / R&D" step={signatures.editedBy} />
          <Signature title="Người kiểm tra" subtitle="Reviewed by / TP. NCPT / Head of R&D" step={signatures.reviewedBy} />
          <Signature title="Người thẩm định" subtitle="Appraised by / TP.DBCL / Head of QA" step={signatures.appraisedBy} />
          <Signature title="Người phê duyệt" subtitle="Approved by / GĐ. SẢN XUẤT / Production director" step={signatures.approvedBy} />
        </section>
        <table className="print-table">
          <thead>
            <tr>
              <th>TT / No</th>
              <th>Bản số / Version</th>
              <th>Nơi nhận / Distributed unit</th>
              <th>Ký tên / Signature</th>
              <th>Ghi chú / Notes</th>
            </tr>
          </thead>
          <tbody>
            {notice.distributions.map((dist, index) => (
              <tr key={dist.id}>
                <td>{index + 1}</td>
                <td>{dist.versionLabel}</td>
                <td>{dist.receivingUnit}</td>
                <td>{dist.acknowledgedBy?.name || ""}</td>
                <td>{dist.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </article>
    </div>
  );
}

function Signature({ title, subtitle, step }: { title: string; subtitle: string; step?: WorkflowStep }) {
  return (
    <div>
      <h3>{title}</h3>
      <p>{subtitle}</p>
      <div className="signature-box">
        {step?.signer ? (
          <>
            <strong>{step.signer.name}</strong>
            <small>{new Date(step.createdAt).toLocaleString("vi-VN")}</small>
            <small>{step.signatureMeaning}</small>
          </>
        ) : (
          <span>Chưa ký</span>
        )}
      </div>
    </div>
  );
}
