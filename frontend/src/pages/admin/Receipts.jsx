import { useCallback, useEffect, useState } from "react";
import { get, openFileInNewTab, post } from "../../api/client";
import { useI18n } from "../../useI18n";

const STATUS_KEY = { pending: "receipt_status_pending", approved: "receipt_status_approved", rejected: "receipt_status_rejected" };

// Bank-transfer receipts uploaded by customers. The admin checks each one against the bank
// statement, then approves it (with the amount that really arrived) or rejects it with a reason.
export default function Receipts() {
  const { t } = useI18n();
  const [status, setStatus] = useState("pending");
  const [rows, setRows] = useState([]);
  const [amounts, setAmounts] = useState({}); // receipt id -> amount the admin typed
  const [busyId, setBusyId] = useState(null);
  const [note, setNote] = useState(null); // {ok, text}

  const load = useCallback(async () => {
    try {
      setRows(await get(`/admin/receipts${status ? `?status=${status}` : ""}`));
    } catch (e) {
      setNote({ ok: false, text: e.message });
    }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  async function view(r) {
    setNote(null);
    try {
      await openFileInNewTab(`/admin/receipts/${r.id}/file`);
    } catch (e) {
      setNote({ ok: false, text: e.message });
    }
  }

  async function approve(r) {
    const amount = Number(amounts[r.id] ?? r.amount_claimed);
    if (!amount || amount <= 0) return;
    if (!window.confirm(t("receipt_confirm_approve", { name: r.customer_name, amount: amount.toLocaleString() }))) return;
    setBusyId(r.id);
    setNote(null);
    try {
      await post(`/admin/receipts/${r.id}/approve`, { amount_received: amount });
      setNote({ ok: true, text: t("receipt_approved_notice", { name: r.customer_name }) });
      await load();
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  async function reject(r) {
    const reason = window.prompt(t("receipt_reject_prompt"));
    if (!reason || reason.trim().length < 3) return;
    setBusyId(r.id);
    setNote(null);
    try {
      await post(`/admin/receipts/${r.id}/reject`, { reason: reason.trim() });
      setNote({ ok: true, text: t("receipt_rejected_notice", { name: r.customer_name }) });
      await load();
    } catch (e) {
      setNote({ ok: false, text: e.message });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <div className="row">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="pending">{t("receipt_status_pending")}</option>
          <option value="approved">{t("receipt_status_approved")}</option>
          <option value="rejected">{t("receipt_status_rejected")}</option>
          <option value="">{t("status_all")}</option>
        </select>
        <button className="btn ghost" onClick={load}>{t("refresh")}</button>
      </div>
      <p className="muted">{t("receipts_admin_hint")}</p>
      {note && <p className={note.ok ? "ok" : "err"}>{note.text}</p>}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t("th_name")}</th><th>{t("th_period")}</th><th>{t("th_fee")}</th>
              <th>{t("th_claimed")}</th><th>{t("th_reference")}</th><th>{t("th_date")}</th>
              <th>{t("th_status")}</th><th>{t("th_actions")}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.customer_name}<br /><small className="muted">{r.phone} - {r.ward}</small></td>
                <td>{r.billing_period}</td>
                <td>TZS {Number(r.expected_fee_tzs).toLocaleString()}</td>
                <td>TZS {Number(r.amount_claimed).toLocaleString()}</td>
                <td>{r.reference || "-"}</td>
                <td>{new Date(r.created_at).toLocaleString()}</td>
                <td>
                  <span className={`badge ${r.status === "approved" ? "paid" : r.status === "rejected" ? "bin" : "billed"}`}>
                    {t(STATUS_KEY[r.status] || r.status)}
                  </span>
                  {r.status === "approved" && r.amount_received != null && <><br /><small className="muted">TZS {Number(r.amount_received).toLocaleString()}</small></>}
                  {r.status === "rejected" && r.reject_reason && <><br /><small className="muted">{r.reject_reason}</small></>}
                </td>
                <td>
                  <div className="row" style={{ margin: 0 }}>
                    <button className="btn ghost" onClick={() => view(r)}>{t("receipt_view_btn")}</button>
                    {r.status === "pending" && (
                      <>
                        <input type="number" min={1} style={{ width: 110 }} title={t("receipt_amount_received_label")}
                               value={amounts[r.id] ?? r.amount_claimed}
                               onChange={(e) => setAmounts((a) => ({ ...a, [r.id]: e.target.value }))} />
                        <button className="btn" disabled={busyId === r.id} onClick={() => approve(r)}>{t("receipt_approve_btn")}</button>
                        <button className="btn ghost" style={{ color: "var(--red)", borderColor: "var(--red)" }}
                                disabled={busyId === r.id} onClick={() => reject(r)}>{t("receipt_reject_btn")}</button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={8} className="muted">{t("receipts_empty")}</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
