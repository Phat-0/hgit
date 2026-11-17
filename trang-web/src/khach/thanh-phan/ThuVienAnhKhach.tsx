import { useEffect, useRef, useState, type CSSProperties } from "react";
export default function ThuVienAnhKhach({
  anh,
  onMo,
  chiTiet = false,
  noi = false,
}: {
  anh: { url: string; ten: string }[];
  onMo: (url: string) => void;
  chiTiet?: boolean;
  noi?: boolean;
}) {
  const [index, setIndex] = useState(0),
    [offset, setOffset] = useState(0),
    [settling, setSettling] = useState(false);
  const width = useRef(500);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const gesture = useRef<{ x: number; y: number; id: number } | null>(null),
    swiped = useRef(false);
  const photos = anh.filter(
    (p, i, all) => p.url && all.findIndex((x) => x.url === p.url) === i,
  );
  useEffect(() => {
    setIndex(0);
    setOffset(0);
    setSettling(false);
    if (timer.current) clearTimeout(timer.current);
  }, [anh[0]?.url]);
  const current = Math.min(index, photos.length - 1),
    selected = photos[current];
  const move = (step: number) =>
    setIndex((i) => (i + step + photos.length) % photos.length);
  if (!selected) return <div className="kh-no-photo">Chưa có ảnh phòng</div>;
  return (
    <div
      className={"kh-gallery" + (noi ? " kh-gallery--noi" : "")}
      aria-label="Không gian lưu trú"
    >
      {photos.length > 1 && (
        <div className="kh-gallery-stack" aria-hidden="true">
          <img
            draggable={false}
            src={photos[(current + 1) % photos.length].url}
            alt=""
          />
          <img
            draggable={false}
            src={photos[(current + photos.length - 1) % photos.length].url}
            alt=""
          />
        </div>
      )}
      <div
        className={
          "kh-cms-photo kh-gallery-main" +
          (offset ? " kh-gallery-dragging" : "")
        }
        role="group"
        tabIndex={0}
        aria-label={
          "Ảnh " +
          (current + 1) +
          " / " +
          photos.length +
          ". Kéo hoặc vuốt để chuyển ảnh; Enter để phóng to."
        }
        style={
          {
            transform: "none",
            "--kh-drag": offset,
          } as CSSProperties
        }
        onKeyDown={(e) => {
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            move(e.key === "ArrowRight" ? 1 : -1);
          }
          if (e.key === "Enter") onMo(selected.url);
        }}
        onPointerDown={(e) => {
          if (settling) return;
          if (e.pointerType === "mouse" && e.button !== 0) return;
          width.current = e.currentTarget.clientWidth;
          gesture.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
          swiped.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const g = gesture.current;
          if (!g) return;
          const dx = e.clientX - g.x,
            dy = e.clientY - g.y;
          if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 12) {
            gesture.current = null;
            setOffset(0);
            return;
          }
          if (Math.abs(dx) > 8) {
            swiped.current = true;
            const width = e.currentTarget.clientWidth;
            setOffset(Math.max(-width, Math.min(width, dx)));
          }
        }}
        onPointerUp={(e) => {
          const g = gesture.current;
          if (g) {
            const dx = e.clientX - g.x;
            if (
              Math.abs(dx) > 40 &&
              Math.abs(dx) > Math.abs(e.clientY - g.y) &&
              photos.length > 1
            ) {
              const step = dx < 0 ? 1 : -1;
              if (
                window.matchMedia("(prefers-reduced-motion: reduce)").matches
              ) {
                move(step);
                setOffset(0);
              } else {
                setSettling(true);
                setOffset(-step * e.currentTarget.clientWidth);
                timer.current = setTimeout(() => {
                  move(step);
                  setSettling(false);
                  setOffset(0);
                }, 240);
              }
            } else setOffset(0);
          }
          gesture.current = null;
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          gesture.current = null;
          swiped.current = true;
          setOffset(0);
        }}
        onClick={() => {
          if (!swiped.current) onMo(selected.url);
        }}
      >
        {noi ? (
          <div
            className={
              "kh-gallery-fan" + (settling ? " kh-gallery-settling" : "")
            }
            aria-hidden="true"
          >
            {[-1, 0, 1].map((step) => {
              const slot = step + offset / width.current,
                distance = Math.abs(slot);
              return (
                <img
                  key={step}
                  src={
                    photos[(current + step + photos.length) % photos.length].url
                  }
                  alt=""
                  draggable={false}
                  style={{
                    transform: `translateX(${slot * 48}%) translateY(${distance * 24}px) scale(${1 - Math.min(2, distance) * 0.13}) rotate(${slot * 5}deg)`,
                    opacity: 1 - Math.min(2, distance) * 0.2,
                    zIndex: Math.round(100 - distance * 10),
                  }}
                />
              );
            })}
          </div>
        ) : (
          <div
            className={
              "kh-gallery-track" + (settling ? " kh-gallery-settling" : "")
            }
            style={{ transform: `translateX(calc(-100% + ${offset}px))` }}
            aria-hidden="true"
          >
            {[-1, 0, 1].map((step) => (
              <img
                key={step}
                draggable={false}
                src={
                  photos[(current + step + photos.length) % photos.length].url
                }
                alt=""
                fetchPriority={step === 0 ? "high" : "auto"}
              />
            ))}
          </div>
        )}
        <span className="kh-gallery-caption">
          <span>{selected.ten}</span>
          <small>
            {current + 1} / {photos.length}
          </small>
        </span>
      </div>
      {photos.length > 1 &&
        (chiTiet ? (
          <div className="kh-gallery-controls">
            <div className="kh-gallery-thumbs">
              {photos.map((p, i) => (
                <button
                  key={p.url}
                  type="button"
                  aria-label={"Xem ảnh " + (i + 1)}
                  aria-pressed={i === current}
                  onClick={() => setIndex(i)}
                >
                  <img src={p.url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="kh-gallery-hint" aria-hidden="true">
            <span>← Kéo để khám phá →</span>
            <span>
              {photos.map((p, i) => (
                <i key={p.url} className={i === current ? "active" : ""} />
              ))}
            </span>
          </div>
        ))}
    </div>
  );
}
