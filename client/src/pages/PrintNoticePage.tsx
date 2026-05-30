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

  if (!data) return <div>{error || "Dang tai ban in..."}</div>;
  const { notice, signatures } = data;

  return (
    <div>
      <div className="print-toolbar">
        <button onClick={() => navigate({ page: "detail", id })}>Quay lai</button>
        <button onClick={() => window.print()}>In phieu</button>
      </div>
      <article className="print-page">
        {data.statusMarker && <div className="watermark">{data.statusMarker}</div>}
        <header className="print-header">
          <small>NCPT/BM/019</small>
          <h1>PHIEU THONG BAO THAY DOI</h1>
          <h2>CHANGE NOTICE</h2>
          <p>(Ve su doi noi dung trong du thao quy trinh pha che, du thao quy trinh dong goi)</p>
          <strong>NCPT</strong>
          <p>Date ngay {new Date(notice.issuedDate).toLocaleDateString("vi-VN")}</p>
        </header>
        <section className="print-lines">
          <p><b>Kinh gui/To:</b> {notice.recipient}</p>
          <p><b>Nguoi de nghi thay doi/Proponent:</b> {notice.proposerName}</p>
          <p><b>Bo phan/Dept:</b> {notice.proposerDepartment}</p>
          <h3>1. Thong tin san pham / Product information</h3>
          <p><b>Ten san pham/Product name:</b> {notice.productName}</p>
          <p><b>Ma QTPC/QDG / Manufacturing process code:</b> {notice.manufacturingProcessCode}</p>
          <p><b>Ngay ban hanh/Issued date:</b> {new Date(notice.issuedDate).toLocaleDateString("vi-VN")}</p>
          <p><b>Lan ban hanh phieu thong bao/Notification issuance number:</b> {notice.notificationIssueNumber}</p>
          <h3>2. Noi dung thay doi / Changes</h3>
          <p className="preline">{notice.changeContent}</p>
          <p className="effect-note">{notice.effectiveNote}</p>
        </section>
        <section className="signature-grid">
          <Signature title="Nguoi de nghi" subtitle="Edited by / P. NCPT / R&D" step={signatures.editedBy} />
          <Signature title="Nguoi kiem tra" subtitle="Reviewed by / TP. NCPT / Head of R&D" step={signatures.reviewedBy} />
          <Signature title="Nguoi tham dinh" subtitle="Appraised by / TP.DBCL / Head of QA" step={signatures.appraisedBy} />
          <Signature title="Nguoi phe duyet" subtitle="Approved by / GD. SAN XUAT / Production director" step={signatures.approvedBy} />
        </section>
        <table className="print-table">
          <thead>
            <tr>
              <th>TT / No</th>
              <th>Ban so / Version</th>
              <th>Noi nhan / Distributed unit</th>
              <th>Ky ten / Signature</th>
              <th>Ghi chu / Notes</th>
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
          <span>Chua ky</span>
        )}
      </div>
    </div>
  );
}
