// The customer dashboard. The look lives in src/cx/ (dark / light, glass cards). This file only
// loads the customer's data and puts the cards together - all the payment logic is unchanged:
// push / QR / bank payments, wallet top-up, receipts, history, complaints.
import { useCallback, useEffect, useState } from "react";
import Shell from "../cx/Shell.jsx";
import Hero from "../cx/Hero.jsx";
import PayCard from "../cx/PayCard.jsx";
import WalletCard from "../cx/WalletCard.jsx";
import HistoryCard from "../cx/HistoryCard.jsx";
import FeedbackCard, { HelpCard } from "../cx/Feedback.jsx";
import { I } from "../cx/Icon.jsx";
import { useAuth } from "../auth.jsx";
import { get } from "../api/client";
import { getWallet } from "../api/payments";
import { useI18n } from "../useI18n";

export default function Resident() {
  const { user, refresh } = useAuth();
  const { t } = useI18n();
  const customer = user.customer;
  const [payments, setPayments] = useState([]);
  const [wallet, setWallet] = useState(null);
  const [toast, setToast] = useState(null); // {ok, text}

  const reloadPayments = useCallback(() => get("/payments/mine").then(setPayments).catch(() => {}), []);
  const reloadWallet = useCallback(() => getWallet().then((w) => setWallet(w.wallet_balance_tzs)).catch(() => {}), []);

  useEffect(() => {
    if (customer) { reloadPayments(); reloadWallet(); }
  }, [customer, reloadPayments, reloadWallet]);

  useEffect(() => {
    if (!toast) return undefined;
    const id = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(id);
  }, [toast]);

  if (!customer) return <Shell><p style={{ padding: 20 }}>{t("no_customer_profile")}</p></Shell>;

  // A payment finished (push, QR, wallet or an approved bank receipt): refresh everything on screen.
  const onPaid = () => { refresh(); reloadPayments(); reloadWallet(); };
  const scrollToPay = () => document.getElementById("cx-pay")?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <Shell>
      <Hero user={user} customer={customer} />
      <div className="cx-grid">
        <PayCard customer={customer} fee={user.monthly_fee_tzs} walletBalance={wallet} onPaid={onPaid} onToast={setToast} />
        <div className="cx-sidecol">
          <WalletCard customer={customer} balance={wallet} onDone={() => { reloadWallet(); reloadPayments(); }} />
          <FeedbackCard />
          <HelpCard onToast={setToast} />
        </div>
        <HistoryCard payments={payments} onStart={scrollToPay} onToast={setToast} />
      </div>
      {toast && (
        <div className={`cx-toast ${toast.ok ? "" : "bad"}`} role="status">
          <I n={toast.ok ? "check" : "alert"} size={18} />{toast.text}
        </div>
      )}
    </Shell>
  );
}
