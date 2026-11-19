import {giamChuyenDong} from '../dung-chung/giao-dien/chuyen-dong';
import { useEffect } from "react";
export default function useParallaxTrangChu(active: boolean) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".kh-site"),
      hero = root?.querySelector<HTMLElement>(".kh-cms-hero");
    if (!active || !root || !hero) return;
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let frame = 0,
      images: HTMLElement[] = [];
    let x = 0,
      y = 0;
    const scan = () => {
      images = Array.from(
        root.querySelectorAll<HTMLElement>(".kh-feature-card img"),
      );
    };
    scan();
    const draw = () => {
      frame = 0;
      if (giamChuyenDong()||document.documentElement.dataset.motionFold) return;
      hero.style.setProperty("--pointer-x", x + "px");
      hero.style.setProperty("--pointer-y", y + "px");
      for (const img of images) {
        const b = img.getBoundingClientRect();
        if (b.bottom > 0 && b.top < innerHeight)
          img.style.setProperty(
            "--photo-shift",
            Math.max(
              -16,
              Math.min(16, (innerHeight / 2 - b.top - b.height / 2) * 0.035),
            ) + "px",
          );
      }
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(draw);
    };
    const pointer = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      const b = hero.getBoundingClientRect();
      x = ((e.clientX - b.left) / b.width - 0.5) * 20;
      y = ((e.clientY - b.top) / b.height - 0.5) * 14;
      schedule();
    };
    const reset = () => {
      x = y = 0;
      schedule();
    };
    const changed = new MutationObserver(() => {
      scan();
      schedule();
    });
    changed.observe(root, { childList: true, subtree: true });
    const reduced = () => {
      if (giamChuyenDong()) {
        hero.style.setProperty("--hero-shift", "0px");
        hero.style.setProperty("--hero-zoom", "1");
        x = y = 0;
        hero.style.setProperty("--pointer-x", "0px");
        hero.style.setProperty("--pointer-y", "0px");
        images.forEach((i) => i.style.setProperty("--photo-shift", "0px"));
      } else schedule();
    };
    addEventListener("scroll", schedule, { passive: true });
    addEventListener("resize", schedule);
    hero.addEventListener("pointermove", pointer);
    hero.addEventListener("pointerleave", reset);
    media.addEventListener("change", reduced);
    schedule();
    return () => {
      cancelAnimationFrame(frame);
      changed.disconnect();
      removeEventListener("scroll", schedule);
      removeEventListener("resize", schedule);
      hero.removeEventListener("pointermove", pointer);
      hero.removeEventListener("pointerleave", reset);
      media.removeEventListener("change", reduced);
    };
  }, [active]);
}
