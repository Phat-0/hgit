import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type KeyboardEvent,
} from "react";
type Point = { x: number; y: number };
export function useChatPosition(admin: boolean) {
  const key = "homestay_chat_position:" + (admin ? "admin" : "guest");
  const [screen, setScreen] = useState({
    w: window.innerWidth,
    h: window.innerHeight,
  });
  const clamp = (p: Point, w = window.innerWidth, h = window.innerHeight) => ({
    x: Math.min(Math.max(8, p.x), Math.max(8, w - 62)),
    y: Math.min(Math.max(8, p.y), Math.max(8, h - 62)),
  });
  const [position, setPosition] = useState<Point>(() => {
    try {
      const p = JSON.parse(localStorage.getItem(key) || "null");
      if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) return clamp(p);
    } catch {}
    return clamp({ x: window.innerWidth - 78, y: window.innerHeight - 78 });
  });
  const drag = useRef<{
      id: number;
      start: Point;
      origin: Point;
      moved: boolean;
    } | null>(null),
    skipClick = useRef(false),
    current = useRef(position);
  current.current = position;
  function save(p: Point) {
    const next = clamp(p);
    current.current = next;
    setPosition(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {}
    return next;
  }
  useEffect(() => {
    const resize = () => {
      setScreen({ w: window.innerWidth, h: window.innerHeight });
      save(current.current);
    };
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [key]);
  function onPointerDown(e: ReactPointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return;
    skipClick.current = false;
    drag.current = {
      id: e.pointerId,
      start: { x: e.clientX, y: e.clientY },
      origin: current.current,
      moved: false,
    };
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  }
  function onPointerMove(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.start.x,
      dy = e.clientY - d.start.y;
    if (Math.hypot(dx, dy) > 6) d.moved = true;
    if (d.moved) {
      e.preventDefault();
      const p = clamp({ x: d.origin.x + dx, y: d.origin.y + dy });
      current.current = p;
      setPosition(p);
    }
  }
  function onPointerUp(e: ReactPointerEvent<HTMLButtonElement>) {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    skipClick.current = d.moved;
    if (d.moved) save(current.current);
    drag.current = null;
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
  }
  function onPointerCancel() {
    drag.current = null;
    skipClick.current = false;
    save(current.current);
  }
  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    const steps: Record<string, Point> = {
      ArrowLeft: { x: -1, y: 0 },
      ArrowRight: { x: 1, y: 0 },
      ArrowUp: { x: 0, y: -1 },
      ArrowDown: { x: 0, y: 1 },
    };
    const step = steps[e.key];
    if (step) {
      e.preventDefault();
      const n = e.shiftKey ? 30 : 10;
      save({
        x: current.current.x + step.x * n,
        y: current.current.y + step.y * n,
      });
    }
  }
  const launcherStyle: CSSProperties = {
    left: position.x,
    top: position.y,
    right: "auto",
    bottom: "auto",
    touchAction: "none",
  };
  const hideStyle: CSSProperties = {
    left: Math.min(screen.w - 24, position.x + 42),
    top: Math.max(0, position.y - 9),
    right: "auto",
    bottom: "auto",
  };
  const dockRight = position.x > screen.w / 2;
  const dockStyle: CSSProperties = {
    top: Math.max(8, Math.min(position.y, screen.h - 72)),
    right: dockRight ? 0 : "auto",
    left: dockRight ? "auto" : 0,
  };
  const width = Math.max(1, Math.min(admin ? 850 : 390, screen.w - 24)),
    height = Math.max(1, Math.min(admin ? 640 : 590, screen.h - 115));
  let top = position.y - height - 12;
  if (top < 8)
    top =
      position.y + 66 + height <= screen.h
        ? position.y + 66
        : Math.max(8, (screen.h - height) / 2);
  const windowStyle: CSSProperties = {
    left: Math.max(8, Math.min(position.x - width + 54, screen.w - width - 8)),
    top: Math.max(8, Math.min(top, screen.h - height - 8)),
    right: "auto",
    bottom: "auto",
    width,
    height,
  };
  return {
    launcherStyle,
    hideStyle,
    dockStyle,
    dockRight,
    windowStyle,
    handlers: {
      onPointerDown,
      onPointerMove,
      onPointerUp,
      onPointerCancel,
      onKeyDown,
    },
    consumeDrag: () => {
      const skipped = skipClick.current;
      skipClick.current = false;
      return skipped;
    },
  };
}
