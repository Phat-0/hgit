import { useEffect, useRef, useState } from "react";
import { mocNhanPhong, mocTraPhong, type MocGio } from "./moc-gio-khach";
export function DaiGio({
  label,
  items,
  value,
  onChange,
}: {
  label: string;
  items: MocGio[];
  value: string;
  onChange: (slot: MocGio) => void;
}) {
  const STEP = 48,
    ref = useRef<HTMLDivElement>(null),
    callback = useRef(onChange),
    indexRef = useRef(0),
    gesture = useRef<{ x: number; index: number } | null>(null),
    [offset, setOffset] = useState(0),
    [dragging, setDragging] = useState(false);
  callback.current = onChange;
  const found = items.findIndex((s) => s.ngay + "T" + s.gio === value),
    index = Math.max(0, found);
  indexRef.current = index;
  const dragOffset = useRef(0);
  const slots = useRef(items);
  slots.current = items;
  const select = (i: number) => {
    const next = Math.max(0, Math.min(slots.current.length - 1, i));
    if (next >= 0 && slots.current[next]) {
      indexRef.current = next;
      callback.current(slots.current[next]);
    }
    return next;
  };
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    let total = 0;
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      total += e.deltaY || e.deltaX;
      if (Math.abs(total) >= 24) {
        select(indexRef.current + (total > 0 ? 1 : -1));
        total = 0;
      }
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, []);
  return (
    <div className="kh-hour-strip">
      <span>{label}</span>
      <div
        ref={ref}
        className={"kh-clock-wheel" + (dragging ? " is-dragging" : "")}
        role="spinbutton"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, items.length - 1)}
        aria-valuenow={index}
        aria-valuetext={
          items[index]
            ? items[index].gio +
              (items[index].ngay === "extra" ? "" : " · " + items[index].ngay)
            : "Chưa có giờ phù hợp"
        }
        tabIndex={items.length ? 0 : -1}
        onKeyDown={(e) => {
          if (
            [
              "ArrowLeft",
              "ArrowDown",
              "ArrowRight",
              "ArrowUp",
              "Home",
              "End",
            ].includes(e.key)
          ) {
            e.preventDefault();
            select(
              e.key === "Home"
                ? 0
                : e.key === "End"
                  ? items.length - 1
                  : index +
                    (["ArrowLeft", "ArrowDown"].includes(e.key) ? -1 : 1),
            );
          }
        }}
        onPointerDown={(e) => {
          if (e.pointerType === "mouse" && e.button !== 0) return;
          gesture.current = { x: e.clientX, index };
          setDragging(true);
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          let delta = e.clientX - g.x;
          if (Math.abs(delta) >= STEP) {
            const step = -Math.trunc(delta / STEP),
              next = select(g.index + step);
            const used = next - g.index;
            g.index = next;
            g.x -= used * STEP;
            delta = e.clientX - g.x;
          }
          dragOffset.current = Math.max(-STEP, Math.min(STEP, delta));
          setOffset(dragOffset.current);
        }}
        onPointerUp={(e) => {
          if (gesture.current && Math.abs(dragOffset.current) >= STEP / 2)
            select(gesture.current.index + (dragOffset.current < 0 ? 1 : -1));
          gesture.current = null;
          dragOffset.current = 0;
          setOffset(0);
          setDragging(false);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          gesture.current = null;
          dragOffset.current = 0;
          setOffset(0);
          setDragging(false);
        }}
      >
        {items.length ? (
          [-1, 0, 1].map((step) => {
            const slot =
              items[index + step] ||
              (items[index].ngay === "extra"
                ? null
                : {
                    gio: new Date(
                      items[index].time + step * 1800000 + 7 * 3600000,
                    )
                      .toISOString()
                      .slice(11, 16),
                  });
            const x = step * STEP + offset;
            return slot ? (
              <span
                key={step}
                className="kh-wheel-number"
                data-active={step === 0}
                style={{
                  transform: `translateX(calc(-50% + ${x}px)) scale(${1 - Math.min(1, Math.abs(x) / STEP) * 0.15})`,
                  opacity: Math.max(0.18, 1 - (Math.abs(x) / STEP) * 0.7),
                }}
              >
                {slot.gio}
              </span>
            ) : null;
          })
        ) : (
          <span className="kh-wheel-empty">—</span>
        )}
      </div>
    </div>
  );
}
export default function ChonKhoangGio({
  date,
  endDate,
  start,
  end,
  config,
  onChange,
  minimum = 0.5,
}: {
  minimum?: number;
  date: string;
  endDate: string;
  start: string;
  end: string;
  config: Record<string, string>;
  onChange: (date: string, endDate: string, start: string, end: string) => void;
}) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);
  const starts = mocNhanPhong(date, config, now),
    ends = mocTraPhong(date, start, endDate, config).filter(
      (s) =>
        s.time >=
        Date.parse(date + "T" + start + ":00+07:00") + minimum * 3600000,
    );
  useEffect(() => {
    if (ends.length && !ends.some((s) => s.ngay === endDate && s.gio === end)) {
      const first = ends[0];
      onChange(date, first.ngay, start, first.gio);
    }
  }, [date, start, endDate, end, minimum, config.gio_tu, config.gio_den]);
  return (
    <div className="kh-hour-ranges">
      <DaiGio
        label="Giờ nhận phòng"
        items={starts}
        value={date + "T" + start}
        onChange={(s) => {
          let last = endDate < s.ngay ? s.ngay : endDate;
          let next = mocTraPhong(s.ngay, s.gio, last, config).filter(
            (x) => x.time >= s.time + minimum * 3600000,
          );
          if (!next.length && config.gio_tu === config.gio_den) {
            last = new Date(Date.parse(s.ngay + "T12:00:00+07:00") + 86400000)
              .toISOString()
              .slice(0, 10);
            next = mocTraPhong(s.ngay, s.gio, last, config).filter(
              (x) => x.time >= s.time + minimum * 3600000,
            );
          }
          const finish =
            next.find((x) => x.ngay === endDate && x.gio === end) ||
            next.find((x) => x.time >= s.time + 3600000) ||
            next[0];
          onChange(s.ngay, finish?.ngay || endDate, s.gio, finish?.gio || end);
        }}
      />
      <DaiGio
        label="Giờ trả phòng"
        items={ends}
        value={endDate + "T" + end}
        onChange={(s) => onChange(date, s.ngay, start, s.gio)}
      />
      <small>
        Lướt để chọn · {config.gio_tu}–{config.gio_den}
        {config.gio_tu > config.gio_den
          ? " hôm sau"
          : config.gio_tu === config.gio_den
            ? " · 24 giờ"
            : ""}{" "}
        · Mỗi mốc 30 phút
      </small>
    </div>
  );
}
