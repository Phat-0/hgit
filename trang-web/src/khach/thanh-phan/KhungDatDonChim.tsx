import { useLayoutEffect, useRef, type ReactNode } from "react";
export default function KhungDatDonChim({
  open,
  children,
  duration = 1600,
  animate = true,
}: {
  open: boolean;
  children: ReactNode;
  duration?: number;
  animate?: boolean;
  title?: string;
  description?: string;
}) {
  const node = useRef<HTMLDivElement>(null),
    previous = useRef(open),
    interrupted = useRef<number | null>(null);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    if (previous.current === open) {
      el.hidden = !open;
      return;
    }
    previous.current = open;
    el.hidden = false;
    if (!animate) {
      el.hidden = !open;
      return;
    }
    const height = el.scrollHeight,
      from = interrupted.current ?? (open ? 0 : height);
    interrupted.current = null;
    el.style.overflow = "hidden";
    el.style.height = from + "px";
    document.documentElement.dataset.motionFold = "1";
    const animation = el.animate(
      [
        { height: from + "px", opacity: open ? 0.65 : 1 },
        { height: (open ? height : 0) + "px", opacity: open ? 1 : 0.65 },
      ],
      {
        duration: Math.max(1000, Math.min(1800, duration)),
        easing: "cubic-bezier(.35,.35,.65,.65)",
        fill: "forwards",
      },
    );
    let finished = false;
    animation.onfinish = () => {
      finished = true;
      el.hidden = !open;
      el.style.height = "";
      el.style.overflow = "";
      animation.cancel();
      delete document.documentElement.dataset.motionFold;
      dispatchEvent(new Event("resize"));
    };
    return () => {
      if (!finished) interrupted.current = el.getBoundingClientRect().height;
      animation.onfinish = null;
      animation.cancel();
      el.style.height = "";
      el.style.overflow = "";
      delete document.documentElement.dataset.motionFold;
    };
  }, [open, duration, animate]);
  return (
    <div
      ref={node}
      id="kh-booking-panel"
      hidden={!open}
      aria-hidden={!open}
      inert={!open}
      className="kh-booking-fold"
    >
      <div className="kh-booking-panel">
        <div className="kh-booking-content">{children}</div>
      </div>
    </div>
  );
}
