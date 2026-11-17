import { useEffect, useRef, useState } from "react";
import { mocNhanPhong, mocTraPhong, type MocGio } from "./moc-gio-khach";
function DaiGio({
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
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const wheel = (e: WheelEvent) => {
      if (
        Math.abs(e.deltaY) > Math.abs(e.deltaX) &&
        node.scrollWidth > node.clientWidth
      ) {
        e.preventDefault();
        node.scrollLeft += e.deltaY;
      }
    };
    node.addEventListener("wheel", wheel, { passive: false });
    return () => node.removeEventListener("wheel", wheel);
  }, []);
  useEffect(() => {
    const selected = ref.current?.querySelector<HTMLElement>(
      '[aria-checked="true"]',
    );
    if (selected && ref.current)
      ref.current.scrollLeft =
        selected.offsetLeft -
        ref.current.offsetLeft -
        ref.current.clientWidth / 2 +
        selected.clientWidth / 2;
  }, [value, items.length]);
  return (
    <div className="kh-hour-strip">
      <span>{label}</span>
      <div ref={ref} role="radiogroup" aria-label={label} tabIndex={-1}>
        {items.map((slot, i) => (
          <button
            type="button"
            key={slot.time}
            role="radio"
            aria-checked={slot.ngay + "T" + slot.gio === value}
            tabIndex={
              slot.ngay + "T" + slot.gio === value ||
              (!items.some((x) => x.ngay + "T" + x.gio === value) && i === 0)
                ? 0
                : -1
            }
            onClick={() => onChange(slot)}
            onKeyDown={(e) => {
              if (["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) {
                e.preventDefault();
                const index =
                  e.key === "Home"
                    ? 0
                    : e.key === "End"
                      ? items.length - 1
                      : Math.max(
                          0,
                          Math.min(
                            items.length - 1,
                            i + (e.key === "ArrowRight" ? 1 : -1),
                          ),
                        );
                onChange(items[index]);
                (
                  e.currentTarget.parentElement?.children[index] as HTMLElement
                )?.focus();
              }
            }}
          >
            {slot.gio}
            <small>
              {new Date(slot.time).toLocaleDateString("vi-VN", {
                timeZone: "Asia/Ho_Chi_Minh",
                day: "2-digit",
                month: "2-digit",
              })}
            </small>
          </button>
        ))}
      </div>
      {!items.length && <small>Không có mốc giờ phù hợp. Hãy đổi ngày.</small>}
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
}: {
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
    ends = mocTraPhong(date, start, endDate, config);
  return (
    <div className="kh-hour-ranges">
      <DaiGio
        label="Giờ nhận phòng"
        items={starts}
        value={date + "T" + start}
        onChange={(s) => {
          let last = endDate < s.ngay ? s.ngay : endDate;
          let next = mocTraPhong(s.ngay, s.gio, last, config);
          if (!next.length && config.gio_tu === config.gio_den) {
            last = new Date(Date.parse(s.ngay + "T12:00:00+07:00") + 86400000)
              .toISOString()
              .slice(0, 10);
            next = mocTraPhong(s.ngay, s.gio, last, config);
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
