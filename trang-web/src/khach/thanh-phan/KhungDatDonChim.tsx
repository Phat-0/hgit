import { useLayoutEffect, useRef, type ReactNode } from "react";
export default function KhungDatDonChim({
  open,
  children,
  title = "Đặt đơn",
  description = "",
  duration = 900,
  animate = true,
}: {
  open: boolean;
  children: ReactNode;
  title?: string;
  description?: string;
  duration?: number;
  animate?: boolean;
}) {
  const node = useRef<HTMLDivElement>(null),
    previous = useRef(open);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    if (previous.current === open) {
      el.hidden = !open;
      return;
    }
    previous.current = open;
    el.hidden = false;
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.hidden = !open;
      return;
    }
    // Only composited properties: do not animate the form's height on every frame.
    const panel = el.firstElementChild as HTMLElement;
    const motion = panel.animate(
      open
        ? [
            { opacity: 0, transform: "translate3d(0,-16px,0)" },
            { opacity: 1, transform: "translate3d(0,0,0)" },
          ]
        : [
            { opacity: 1, transform: "translate3d(0,0,0)" },
            { opacity: 0, transform: "translate3d(0,-12px,0)" },
          ],
      {
        duration: open
          ? Math.max(500, Math.min(1400, duration))
          : Math.min(350, duration),
        easing: "cubic-bezier(.22,.61,.36,1)",
      },
    );
    motion.onfinish = () => {
      el.hidden = !open;
    };
    return () => {
      motion.onfinish = null;
      motion.cancel();
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
        <aside className="kh-booking-side">
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </aside>
        <div className="kh-booking-content">{children}</div>
      </div>
    </div>
  );
}
