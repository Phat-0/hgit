import { useLayoutEffect, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./range-picker.css";
type Props = {
  start: string;
  end: string;
  onChange: (a: string, b: string) => void;
  compact?: boolean;
  minDate?: string;
  maxDate?: string;
  quickMonth?: boolean;
  disabled?: boolean;
  placeholder?: string;
};
export function RangePicker({
  start,
  end,
  onChange,
  compact = false,
  minDate,
  maxDate,
  quickMonth = false,
  disabled = false,
  placeholder,
}: Props) {
  const [open, setOpen] = useState(false),
    [first, setFirst] = useState<string | null>(null),
    [month, setMonth] = useState(start.slice(0, 7));
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const anchor = useRef<HTMLButtonElement>(null),
    panel = useRef<HTMLDivElement>(null);
  const close = () => {
    setOpen(false);
    setFirst(null);
  };
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      if (!anchor.current || !panel.current) return;
      const a = anchor.current.getBoundingClientRect(),
        p = panel.current.getBoundingClientRect();
      const top =
        a.bottom + 8 + p.height <= window.innerHeight - 12
          ? a.bottom + 8
          : Math.max(12, a.top - p.height - 8);
      setPosition({
        top: Math.min(top, Math.max(12, window.innerHeight - p.height - 12)),
        left: Math.max(
          12,
          Math.min(a.right - p.width, window.innerWidth - p.width - 12),
        ),
      });
    };
    place();
    const observer = new ResizeObserver(place);
    if (panel.current) observer.observe(panel.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, month, first]);
  useEffect(() => {
    if (!open) return;
    const dismiss = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!anchor.current?.contains(target) && !panel.current?.contains(target))
        close();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        close();
        anchor.current?.focus();
      }
    };
    document.addEventListener("pointerdown", dismiss);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", dismiss);
      document.removeEventListener("keydown", key);
    };
  }, [open]);
  const shift = (m: string, n: number) => {
    const [y, mo] = m.split("-").map(Number);
    return new Date(Date.UTC(y, mo - 1 + n, 1)).toISOString().slice(0, 7);
  };
  const renderMonth = (m: string) => {
    const [y, mo] = m.split("-").map(Number),
      count = new Date(Date.UTC(y, mo, 0)).getUTCDate(),
      offset = (new Date(Date.UTC(y, mo - 1, 1)).getUTCDay() + 6) % 7;
    return (
      <div className="lp-calendar-month" key={m}>
        <strong>
          {new Date(Date.UTC(y, mo - 1, 1)).toLocaleDateString("vi-VN", {
            month: "long",
            year: "numeric",
            timeZone: "UTC",
          })}
        </strong>
        <div className="lp-calendar-week">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <div className="lp-calendar-days">
          {Array.from({ length: offset }, (_, i) => (
            <span key={"pad" + i} />
          ))}
          {Array.from({ length: count }, (_, i) => {
            const d = m + "-" + String(i + 1).padStart(2, "0");
            return (
              <button
                type="button"
                key={d}
                disabled={
                  (!!minDate && d < minDate) || (!!maxDate && d > maxDate)
                }
                className={
                  (d >= start && d <= end ? "lp-in-range " : "") +
                  (d === first ? "lp-first" : "")
                }
                onClick={() => {
                  if (!first) setFirst(d);
                  else {
                    onChange(d < first ? d : first, d > first ? d : first);
                    close();
                    anchor.current?.focus();
                  }
                }}
              >
                {i + 1}
              </button>
            );
          })}
        </div>
      </div>
    );
  };
  const fmt = (d: string) => d.split("-").reverse().join("/");
  return (
    <div
      className={
        "lp-range-control" + (compact ? " lp-range-control-compact" : "")
      }
    >
      <button
        ref={anchor}
        type="button"
        className="lp-range-button"
        disabled={disabled}
        onClick={() => {
          setPosition(null);
          setOpen((v) => !v);
          setFirst(null);
          setMonth(start.slice(0, 7));
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span aria-hidden="true">▦</span>
        {placeholder || `${fmt(start)} – ${fmt(end)}`}
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            role="dialog"
            aria-label="Chọn khoảng ngày"
            className="lp-range-dual lp-range-portal"
            style={{
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              visibility: position ? "visible" : "hidden",
            }}
          >
            <div className="lp-range-navigation">
              <button
                type="button"
                aria-label="Tháng trước"
                onClick={() => setMonth((v) => shift(v, -1))}
              >
                ‹
              </button>
              <span>{first ? "Chọn ngày kết thúc" : "Chọn ngày bắt đầu"}</span>
              <button
                type="button"
                aria-label="Tháng sau"
                onClick={() => setMonth((v) => shift(v, 1))}
              >
                ›
              </button>
            </div>
            {quickMonth && (
              <div className="lp-range-quick-month">
                <label>
                  Chọn nhanh tháng
                  <input
                    type="month"
                    aria-label="Chọn nhanh tháng"
                    value={month}
                    onChange={(e) => {
                      if (/^\d{4}-(0[1-9]|1[0-2])$/.test(e.target.value))
                        setMonth(e.target.value);
                    }}
                  />
                </label>
                <button
                  type="button"
                  disabled={
                    (!!minDate && shift(month, 1) + "-01" <= minDate) ||
                    (!!maxDate && month + "-01" > maxDate)
                  }
                  onClick={() => {
                    const last = new Date(
                      Date.UTC(
                        Number(month.slice(0, 4)),
                        Number(month.slice(5, 7)),
                        0,
                      ),
                    )
                      .toISOString()
                      .slice(0, 10);
                    onChange(
                      minDate && minDate > month + "-01"
                        ? minDate
                        : month + "-01",
                      maxDate && maxDate < last ? maxDate : last,
                    );
                    close();
                    anchor.current?.focus();
                  }}
                >
                  Chọn tháng
                </button>
              </div>
            )}
            <div className="lp-calendar-pair">
              {renderMonth(month)}
              {renderMonth(shift(month, 1))}
            </div>
            <button
              type="button"
              className="lp-range-close"
              onClick={() => {
                close();
                anchor.current?.focus();
              }}
            >
              Đóng
            </button>
          </div>,
          document.body,
        )}
    </div>
  );
}
