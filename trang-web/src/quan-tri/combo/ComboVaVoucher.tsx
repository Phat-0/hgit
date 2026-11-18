import { useState } from "react";
import GoiGiaCombo from "./GoiGiaCombo";
import Voucher from "./Voucher";
import "./combo-voucher.css";
export default function ComboVaVoucher({ token }: { token: string }) {
  const [tab, setTab] = useState("combo");
  return (
    <>
      <nav className="cv-tabs" aria-label="Combo và voucher">
        {[
          ["combo", "Combo"],
          ["voucher", "Voucher"],
        ].map(([id, name]) => (
          <button
            key={id}
            aria-selected={tab === id}
            onClick={() => setTab(id)}
          >
            {name}
          </button>
        ))}
      </nav>
      {tab === "combo" ? (
        <GoiGiaCombo token={token} />
      ) : (
        <Voucher token={token} />
      )}
    </>
  );
}
