import { useEffect, useRef, useState } from "react";
import BieuTuong, {
  type TenBieuTuong,
} from "../../dung-chung/giao-dien/BieuTuong";
export default function ConSoLuuTru({
  name,
  stats,
  animate=true,
}: {
  name: string;
  animate?:boolean;
  stats:
    { so_homestay: number; so_phong: number; luot_khach: number } | undefined;
}) {
  const ref = useRef<HTMLElement>(null);
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    if (!ref.current || !stats) return;
    if(!animate){setVisible(true);return;}
    const ob = new IntersectionObserver(
      (entries) => {
        if (entries.some((x) => x.isIntersecting)) {
          setVisible(true);
          ob.disconnect();
        }
      },
      { threshold: 0.25 },
    );
    ob.observe(ref.current);
    return () => ob.disconnect();
  }, [!!stats,animate]);
  useEffect(() => {
    if (!visible) return;
    if (!animate || matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setProgress(1);
      return;
    }
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 750);
      setProgress(1 - Math.pow(1 - p, 3));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [visible,animate]);
  return (
    <section
      ref={ref}
      className={"kh-stay-numbers " + (visible ? "is-visible" : "")}
      aria-label="Thông tin Homestay"
    >
      <h2>{name}</h2>
      <div>
        {(
          [
            [stats?.so_homestay, "Homestay", "building"],
            [stats?.so_phong, "Phòng", "bed"],
            [stats?.luot_khach, "Lượt khách lưu trú", "users"],
          ] as [number | undefined, string, TenBieuTuong][]
        ).map(([count, label, icon], i) => (
          <article
            key={icon}
            style={{ "--kh-stat-delay": i * 90 + "ms" } as React.CSSProperties}
          >
            <BieuTuong ten={icon} size={24} />
            <div>
              <strong>
                {count == null
                  ? "—"
                  : Math.round(Number(count) * progress).toLocaleString(
                      "vi-VN",
                    )}
              </strong>
              <span>{label}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
