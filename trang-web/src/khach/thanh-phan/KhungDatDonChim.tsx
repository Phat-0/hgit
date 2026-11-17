import { useLayoutEffect, useRef, type ReactNode } from "react";
/** Animate the fold while retaining the booking draft and restoring popup overflow afterwards. */
export default function KhungDatDonChim({
  open,
  children,
  duration = 750,
  animate = true,
}: {
  open: boolean;
  duration?: number;
  animate?: boolean;
  children: ReactNode;
}) {
  const node = useRef<HTMLDivElement>(null),
    previousOpen = useRef(open);
  useLayoutEffect(() => {
    const el = node.current;
    if (!el) return;
    if (previousOpen.current === open) {
      el.hidden = !open;
      return;
    }
    previousOpen.current = open;
    el.hidden = false;
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      el.hidden = !open;
      return;
    }
    const height = el.scrollHeight;
    el.style.overflow = "hidden";
    const animation = el.animate(
      [
        { height: (open ? 0 : height) + "px", opacity: open ? 0.4 : 1 },
        { height: (open ? height : 0) + "px", opacity: open ? 1 : 0.4 },
      ],
      {
        duration: Math.max(300, Math.min(1600, duration)),
        easing: "cubic-bezier(.2,.65,.3,1)",
      },
    );
    animation.onfinish = () => {
      el.hidden = !open;
      el.style.overflow = "";
    };
    return () => {
      animation.onfinish = null;
      animation.cancel();
      el.style.overflow = "";
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
      <div className="kh-booking-panel">{children}</div>
    </div>
  );
}
