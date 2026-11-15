import { useEffect, useState } from "react";
import SoThuChi from "./SoThuChi";
import ThongKeThuChi from "./ThongKeThuChi";
import type { Go } from "./bao-cao-api";
import "./thong-ke-thu-chi.css";
export default function BaoCao(props: {
  token: string;
  initial?: { tu_ngay?: string; den_ngay?: string };
  onGo: Go;
}) {
  const [tab, setTab] = useState("thu-chi"),
    [visited, setVisited] = useState(false),
    [dirty, setDirty] = useState(false);
  useEffect(() => {
    if (!dirty) return;
    const unload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const navigate = (e: Event) => {
      if (
        !window.confirm(
          "Bản thống kê chưa lưu ra file. Rời trang và bỏ bản hiện tại?",
        )
      )
        e.preventDefault();
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("homestay:truoc-chuyen-trang", navigate);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("homestay:truoc-chuyen-trang", navigate);
    };
  }, [dirty]);
  return (
    <div className="bc-page">
      <SoThuChi
        token={props.token}
        initial={props.initial}
        renderAnalysis={(chart) => (
          <section
            className="stc-analysis-block"
            aria-label="Phân tích thu chi và thống kê"
          >
            <div
              className="stc-report-tabs"
              role="tablist"
              aria-label="Thu chi và thống kê"
            >
              <button
                role="tab"
                id="tab-thu-chi"
                aria-controls="panel-thu-chi"
                aria-selected={tab === "thu-chi"}
                onClick={() => setTab("thu-chi")}
              >
                Thu chi
              </button>
              <button
                role="tab"
                id="tab-thong-ke"
                aria-controls="panel-thong-ke"
                aria-selected={tab === "thong-ke"}
                onClick={() => {
                  setVisited(true);
                  setTab("thong-ke");
                }}
              >
                Thống kê
              </button>
            </div>
            <div
              id="panel-thu-chi"
              role="tabpanel"
              aria-labelledby="tab-thu-chi"
              hidden={tab !== "thu-chi"}
            >
              {chart}
            </div>
            <div
              id="panel-thong-ke"
              role="tabpanel"
              aria-labelledby="tab-thong-ke"
              hidden={tab !== "thong-ke"}
            >
              {visited && (
                <ThongKeThuChi
                  token={props.token}
                  initial={props.initial}
                  onDirtyChange={setDirty}
                />
              )}
            </div>
          </section>
        )}
      />
    </div>
  );
}
