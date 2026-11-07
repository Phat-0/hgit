import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./chon-gio.css";
export default function ChonGio({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const [open, setOpen] = useState(false),
    [position, setPosition] = useState({ top: 0, left: 0 });
  const anchor = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const parts = /^\d{2}:\d{2}$/.test(value) ? value.split(":") : ["00", "00"];
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!anchor.current || !panel.current) return;
      const a = anchor.current.getBoundingClientRect(),
        p = panel.current.getBoundingClientRect();
      setPosition({
        top:
          a.bottom + 8 + p.height < window.innerHeight - 12
            ? a.bottom + 8
            : Math.max(12, a.top - p.height - 8),
        left: Math.max(12, Math.min(a.left, window.innerWidth - p.width - 12)),
      });
    };
    place();
    panel.current
      ?.querySelector<HTMLElement>('[aria-pressed="true"]')
      ?.scrollIntoView?.({ block: "nearest" });
    const ob = new ResizeObserver(place);
    if (panel.current) ob.observe(panel.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      ob.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: PointerEvent) => {
      if (
        !anchor.current?.contains(e.target as Node) &&
        !panel.current?.contains(e.target as Node)
      )
        setOpen(false);
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
        anchor.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", key);
    panel.current
      ?.querySelector<HTMLButtonElement>('[aria-pressed="true"]')
      ?.focus();
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  return (
    <>
      <button
        type="button"
        ref={anchor}
        className="cg-trigger"
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{value || "Chọn giờ"}</span>
        <span aria-hidden="true">◷</span>
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            className="cg-portal"
            role="dialog"
            aria-label={label}
            style={position}
          >
            <div className="cg-heading">
              <strong>Chọn giờ</strong>
              <button
                type="button"
                aria-label="Đóng chọn giờ"
                onClick={() => {
                  setOpen(false);
                  anchor.current?.focus();
                }}
              >
                ×
              </button>
            </div>
            <div className="cg-columns">
              {["Giờ", "Phút"].map((name, index) => (
                <div key={name}>
                  <span>{name}</span>
                  <div>
                    {Array.from({ length: index ? 60 : 24 }, (_, i) =>
                      String(i).padStart(2, "0"),
                    ).map((v) => (
                      <button
                        type="button"
                        key={v}
                        aria-label={v + " " + name.toLowerCase()}
                        aria-pressed={parts[index] === v}
                        onClick={() => {
                          onChange(
                            index ? parts[0] + ":" + v : v + ":" + parts[1],
                          );
                          if (index) {
                            setOpen(false);
                            anchor.current?.focus();
                          }
                        }}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
