import { useEffect, useRef, useState } from "react";
const macDinh = [125, 210, 145, 80, 185, 175, 90, 160];
export function useDoRongCot() {
  const [widths, setWidths] = useState<number[]>(() => {
    try {
      const v = JSON.parse(
        localStorage.getItem("so-thu-chi:do-rong-cot") || "null",
      );
      return Array.isArray(v) &&
        v.length === macDinh.length &&
        v.every(
          (n) =>
            typeof n === "number" && Number.isFinite(n) && n >= 70 && n <= 600,
        )
        ? v
        : macDinh;
    } catch {
      return macDinh;
    }
  });
  const drag = useRef<{ index: number; x: number; width: number } | null>(null);
  useEffect(() => {
    const move = (e: PointerEvent) => {
      if (!drag.current) return;
      const d = drag.current;
      setWidths((w) =>
        w.map((n, i) =>
          i === d.index
            ? Math.max(70, Math.min(600, d.width + e.clientX - d.x))
            : n,
        ),
      );
    };
    const stop = () => {
      drag.current = null;
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    window.addEventListener("blur", stop);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("blur", stop);
    };
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("so-thu-chi:do-rong-cot", JSON.stringify(widths));
    } catch {}
  }, [widths]);
  function handle(index: number, label: string) {
    return (
      <span
        role="separator"
        tabIndex={0}
        aria-orientation="vertical"
        aria-label={"Độ rộng cột " + label}
        aria-valuenow={Math.round(widths[index])}
        aria-valuemin={70}
        aria-valuemax={600}
        className="stc-column-resize"
        title="Kéo để đổi độ rộng · nhấp đúp để đặt lại"
        onPointerDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
          drag.current = { index, x: e.clientX, width: widths[index] };
        }}
        onDoubleClick={() =>
          setWidths((w) => w.map((n, i) => (i === index ? macDinh[i] : n)))
        }
        onKeyDown={(e) => {
          if (!["ArrowLeft", "ArrowRight", "Home"].includes(e.key)) return;
          e.preventDefault();
          setWidths((w) =>
            w.map((n, i) =>
              i === index
                ? e.key === "Home"
                  ? macDinh[i]
                  : Math.max(
                      70,
                      Math.min(600, n + (e.key === "ArrowRight" ? 10 : -10)),
                    )
                : n,
            ),
          );
        }}
      />
    );
  }
  return { widths, handle };
}
