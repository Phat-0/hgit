import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import "./anh-phong-noi.css";
export default function AnhPhongNoi({
  url,
  title,
  onClose,
  label = "Xem ảnh phòng",
  action,
  images = [],
  onNavigate,
}: {
  url: string;
  title: string;
  onClose: () => void;
  label?: string;
  action?: { label: string; onClick: () => void };
  images?: string[];
  onNavigate?: (url: string) => void;
}) {
  const close = useRef<HTMLButtonElement>(null),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null),
    [closing, setClosing] = useState(false),
    [direction, setDirection] = useState(1);
  const photos = [
    ...new Set(
      [...(images.includes(url) ? images : [url, ...images])].filter(Boolean),
    ),
  ];
  const index = photos.indexOf(url);
  const callbacks = useRef({ onClose, onNavigate, photos, index });
  callbacks.current = { onClose, onNavigate, photos, index };
  const dismiss = () => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
      callbacks.current.onClose();
      return;
    }
    setClosing(true);
    if (!timer.current)
      timer.current = setTimeout(() => callbacks.current.onClose(), 220);
  };
  const move = (step: number) => {
    const c = callbacks.current;
    if (c.photos.length < 2 || !c.onNavigate) return;
    setDirection(step);
    c.onNavigate(
      c.photos[(c.index + step + c.photos.length) % c.photos.length],
    );
  };
  useEffect(() => {
    const before = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    close.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
      if (e.key === "ArrowRight") {
        e.preventDefault();
        move(1);
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        move(-1);
      }
      if (e.key === "Tab") {
        const nodes = Array.from(
            close.current?.parentElement?.querySelectorAll<HTMLButtonElement>(
              "button",
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
      if (timer.current) clearTimeout(timer.current);
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", key);
      before?.focus();
    };
  }, []);
  return createPortal(
    <div
      className={"anh-phong-noi" + (closing ? " is-closing" : "")}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <button type="button" ref={close} onClick={dismiss} aria-label="Đóng ảnh">
        ×
      </button>
      {photos.length > 1 && onNavigate && (
        <>
          <button
            className="anh-nav anh-prev"
            aria-label="Ảnh trước"
            onClick={() => move(-1)}
          >
            ‹
          </button>
          <button
            className="anh-nav anh-next"
            aria-label="Ảnh tiếp"
            onClick={() => move(1)}
          >
            ›
          </button>
        </>
      )}
      <figure
        key={url}
        style={{ "--photo-direction": direction } as React.CSSProperties}
      >
        <img src={url} alt={title} />
        <figcaption>
          {title}
          {photos.length > 1 && onNavigate && (
            <small>
              {index + 1} / {photos.length}
            </small>
          )}
          {action && (
            <button
              type="button"
              className="anh-phong-thong-tin"
              onClick={action.onClick}
            >
              {action.label} →
            </button>
          )}
        </figcaption>
      </figure>
    </div>,
    document.body,
  );
}
