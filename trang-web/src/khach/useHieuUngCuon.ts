import { useLayoutEffect } from "react";
const selectors =
  ".kh-cms-hero>div:first-child>*,.kh-cms-hero>.kh-gallery,.kh-cms-intro>div>*,.kh-cms-cards article,.kh-stay-numbers>h2,.kh-stay-numbers article,.kh-showcase-tabs,.kh-showcase-tools,.kh-room-card,.kh-feature-card,.kh-reviews>header,.kh-review-track article,.kh-footer-location,.kh-footer-story,.kh-footer-explore,.kh-footer-connect";
/** CSS timelines on supporting browsers; a scoped, one-shot observer elsewhere. */
export default function useHieuUngCuon(
  enabled: boolean,
  home: boolean,
  ready: boolean,
) {
  useLayoutEffect(() => {
    const root = document.querySelector(".kh-site");
    if (
      !root ||
      !enabled ||
      !home ||
      !ready ||
      matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const native = CSS.supports("animation-timeline: view()");
    const seen = new WeakSet<Element>();
    const observer = native
      ? null
      : new IntersectionObserver(
          (entries) =>
            entries.forEach((e) => {
              if (e.isIntersecting) {
                e.target.setAttribute("data-reveal", "shown");
                observer?.unobserve(e.target);
              }
            }),
          { threshold: 0.05, rootMargin: "0px 0px -16px 0px" },
        );
    const register = (el: Element) => {
      if (seen.has(el) || el.closest(".kh-booking-split")) return;
      seen.add(el);
      if (native) el.setAttribute("data-scroll-reveal", "");
      else {
        el.setAttribute("data-reveal", "pending");
        observer?.observe(el);
      }
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
        .querySelectorAll("[data-scroll-reveal],[data-reveal]")
        .forEach((el) => {
          el.removeAttribute("data-scroll-reveal");
          el.removeAttribute("data-reveal");
        });
    };
  }, [enabled, home, ready]);
}
