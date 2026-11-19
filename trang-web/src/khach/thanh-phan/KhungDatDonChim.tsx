import {giamChuyenDong} from '../../dung-chung/giao-dien/chuyen-dong';
import { useLayoutEffect, useRef, type ReactNode } from "react";
export default function KhungDatDonChim({
  open,
  children,
  duration = 1600,
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
    if (!animate || giamChuyenDong()) {
      el.hidden = !open;
      return;
    }
    const bounds = el.getBoundingClientRect();
    if (open && bounds.bottom > innerHeight - 24)
      window.scrollTo({
        top: Math.max(0, scrollY + bounds.top - 96),
        behavior: "instant",
      });
    const panel = el.firstElementChild as HTMLElement;
    const motion = panel.animate(
      open
        ? [
            {
              opacity: 0.2,
              clipPath: "inset(0 0 100% 0)",
              transform: "translate3d(0,-32px,0)",
            },
            {
              opacity: 1,
              clipPath: "inset(0 0 0% 0)",
              transform: "translate3d(0,0,0)",
            },
          ]
        : [
            {
              opacity: 1,
              clipPath: "inset(0 0 0% 0)",
              transform: "translate3d(0,0,0)",
            },
            {
              opacity: 0.2,
              clipPath: "inset(0 0 100% 0)",
              transform: "translate3d(0,-32px,0)",
            },
          ],
      {
        duration: open
          ? Math.max(1400, Math.min(1600, duration))
          : Math.max(900, Math.min(1200, duration)),
        easing: "cubic-bezier(.35,.35,.65,.65)",
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

        <div className="kh-booking-content">{children}</div>
      </div>
    </div>
  );
}
