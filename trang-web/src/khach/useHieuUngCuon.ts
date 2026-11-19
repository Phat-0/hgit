import { giamChuyenDong } from "../dung-chung/giao-dien/chuyen-dong";
import { useLayoutEffect } from "react";
const selectors =
  ".kh-cms-hero>div:first-child,.kh-cms-hero>.kh-gallery,.kh-cms-intro>div,.kh-cms-cards,.kh-stay-numbers,.kh-showcase-tabs,.kh-showcase-tools,.kh-showcase-cards,.kh-reviews>header,.kh-review-track,.kh-footer-location,.kh-footer-story,.kh-footer-explore,.kh-footer-connect,.kh-footer-bottom";
/** CSS timelines on supporting browsers; a scoped, one-shot observer elsewhere. */
export default function useHieuUngCuon(
  enabled: boolean,
  home: boolean,
  ready: boolean,
) {
  useLayoutEffect(() => {
    const root = document.querySelector(".kh-site");
    if (!root || !enabled || !home || !ready || giamChuyenDong()) return;
    const native = CSS.supports("animation-timeline: view()");
    const seen = new WeakSet<Element>();
    let order = 0;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.setAttribute("data-motion-play", "");
          }
        }),
      { threshold: 0.06, rootMargin: "0px 0px -8px 0px" },
    );
    const register = (el: Element) => {
      if (seen.has(el) || el.closest(".kh-booking-split")) return;
      seen.add(el);
      el.setAttribute(
        "data-motion-style",
        ["rise", "slide", "soft"][order++ % 3],
      );
      const siblings = el.parentElement?.children;
      const index = siblings ? Array.from(siblings).indexOf(el) : 0;
      (el as HTMLElement).style.setProperty(
        "--motion-delay",
        Math.min(5, Math.max(0, index)) * 110 + "ms",
      );
      if (native && !(el instanceof HTMLImageElement && el.style.transform))
        el.setAttribute("data-scroll-reveal", "");
      else el.setAttribute("data-motion-wait", "");
      const bounds = el.getBoundingClientRect();
      if (bounds.top < innerHeight && bounds.bottom > 0) {
        el.setAttribute("data-motion-play", "");
      }
      observer.observe(el);
    };
    const scan = (node: Element) => {
      if (node.matches(selectors)) register(node);
      node.querySelectorAll(selectors).forEach(register);
    };
    scan(root);
    const changes = new MutationObserver((records) =>
      records.forEach((r) =>
        r.addedNodes.forEach((n) => {
          if (n instanceof Element) scan(n);
        }),
      ),
    );
    changes.observe(root, { childList: true, subtree: true });
    return () => {
      observer?.disconnect();
      changes.disconnect();
      root
        .querySelectorAll(
          "[data-scroll-reveal],[data-motion-wait],[data-section-progress]",
        )
        .forEach((el) => {
          el.removeAttribute("data-scroll-reveal");
          el.removeAttribute("data-section-progress");
          el.removeAttribute("data-motion-wait");
          el.removeAttribute("data-motion-play");
        });
    };
  }, [enabled, home, ready]);
}
