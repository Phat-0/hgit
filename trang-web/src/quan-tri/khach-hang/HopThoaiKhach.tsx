import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import "./khach-hang-gon.css";
export default function HopThoaiKhach({
  title,
  onClose,
  busy = false,
  narrow = false,
  children,
}: {
  title: string;
  onClose: () => void;
  busy?: boolean;
  narrow?: boolean;
  children: ReactNode;
}) {
  const id = useId(),
    ref = useRef<HTMLElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) close.current();
      if (e.key === "Tab") {
        const nodes = Array.from(
            ref.current?.querySelectorAll<HTMLElement>(
              "button:not(:disabled),input:not(:disabled),select,textarea,summary",
            ) || [],
          ),
          first = nodes[0],
          last = nodes.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", key);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      previous?.focus();
    };
  }, [busy]);
  return createPortal(
    <div
      className="kh-customer-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !busy) onClose();
      }}
    >
      <section
        ref={ref}
        className={"ql-page kh-customer-modal"+(narrow?" kh-confirm-small":"")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={id}
      >
        <header>
          <h3 id={id}>{title}</h3>
          <button
            type="button"
            aria-label="Đóng cửa sổ khách"
            disabled={busy}
            onClick={onClose}
          >
            ×
          </button>
        </header>
        {children}
      </section>
    </div>,
    document.body,
  );
}
