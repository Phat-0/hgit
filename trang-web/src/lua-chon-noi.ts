import { useEffect, useRef } from "react";
import "./lua-chon-noi.css";

type Picker = {
  panel: HTMLElement;
  summary: HTMLElement;
  oldStyle: string | null;
  oldPopover: string | null;
  resize?: ResizeObserver;
  mutation?: MutationObserver;
};
let users = 0,
  dispose: (() => void) | undefined;
function install(doc: Document) {
  const entries = new Map<HTMLDetailsElement, Picker>();
  const win = doc.defaultView!;
  const active = () =>
    Array.from(
      doc.querySelectorAll<HTMLDetailsElement>(
        "details.stc-check-picker[open]",
      ),
    );
  const clean = (d: HTMLDetailsElement) => {
    const item = entries.get(d);
    if (!item) return;
    entries.delete(d);
    item.resize?.disconnect();
    item.mutation?.disconnect();
    if (
      typeof item.panel.hidePopover === "function" &&
      item.panel.hasAttribute("popover")
    ) {
      try {
        item.panel.hidePopover();
      } catch {
        /* A removed panel may already be out of the top layer. */
      }
    }
    if (item.oldPopover === null) item.panel.removeAttribute("popover");
    else item.panel.setAttribute("popover", item.oldPopover);
    if (item.oldStyle === null) item.panel.removeAttribute("style");
    else item.panel.setAttribute("style", item.oldStyle);
    item.panel.removeAttribute("data-lua-chon");
    item.panel.classList.remove(
      "lua-chon-noi",
      "lua-chon-rong",
      "lua-chon-grid",
      "lua-chon-them",
    );
    item.summary.setAttribute("aria-expanded", "false");
  };
  const close = (d: HTMLDetailsElement, focus = false) => {
    const summary = d.querySelector<HTMLElement>(":scope > summary");
    d.open = false;
    clean(d);
    if (focus) summary?.focus();
  };
  const place = (d: HTMLDetailsElement) => {
    const item = entries.get(d);
    if (!item || !d.open) return;
    if (!d.isConnected || d.closest("[hidden]")) {
      close(d);
      return;
    }
    const a = item.summary.getBoundingClientRect(),
      vv = win.visualViewport;
    const x0 = (vv?.offsetLeft || 0) + 12,
      y0 = (vv?.offsetTop || 0) + 12,
      vw = vv?.width || win.innerWidth,
      vh = vv?.height || win.innerHeight,
      x1 = x0 + vw - 24,
      y1 = y0 + vh - 24;
    if (a.height > 0 && (a.bottom < y0 || a.top > y1)) {
      close(d);
      return;
    }
    const roomy = d.classList.contains("tk-scope-picker"),
      add = d.classList.contains("tk-add-column"),
      menu = d.classList.contains("stc-chart-menu");
    const width = Math.max(
      1,
      Math.min(
        roomy
          ? item.panel.classList.contains("tk-object-layout")
            ? 510
            : 560
          : add
            ? 680
            : menu
              ? 240
              : 500,
        vw - 24,
      ),
    );
    const below = Math.max(0, y1 - a.bottom - 6),
      above = Math.max(0, a.top - y0 - 6),
      height = Math.max(1, Math.min(520, Math.max(below, above), vh - 24));
    const set = (key: string, value: string) =>
      item.panel.style.setProperty(key, value, "important");
    set("position", "fixed");
    set("margin", "0");
    set("inset", "auto");
    set("width", width + "px");
    set("min-width", "0");
    set("max-width", width + "px");
    set("max-height", height + "px");
    const h = Math.min(item.panel.getBoundingClientRect().height, height);
    const left = Math.max(
      x0,
      Math.min(menu ? a.right - width : a.left, x1 - width),
    );
    const top = Math.max(
      y0,
      Math.min(h <= below ? a.bottom + 6 : a.top - h - 6, y1 - h),
    );
    set("left", left + "px");
    set("top", top + "px");
  };
  const open = (d: HTMLDetailsElement) => {
    if (entries.has(d)) {
      place(d);
      return;
    }
    const panel = d.querySelector<HTMLElement>(":scope > div"),
      summary = d.querySelector<HTMLElement>(":scope > summary");
    if (!panel || !summary) return;
    if (d.closest("[hidden]")) {
      close(d);
      return;
    }
    for (const other of active())
      if (other !== d && !other.contains(d)) close(other);
    const item: Picker = {
      panel,
      summary,
      oldStyle: panel.getAttribute("style"),
      oldPopover: panel.getAttribute("popover"),
    };
    entries.set(d, item);
    panel.dataset.luaChon = "true";
    panel.classList.add("lua-chon-noi");
    if (d.classList.contains("tk-scope-picker"))
      panel.classList.add("lua-chon-rong");
    else if (d.classList.contains("tk-add-column"))
      panel.classList.add("lua-chon-them");
    else if (!d.classList.contains("stc-chart-menu"))
      panel.classList.add("lua-chon-grid");
    summary.setAttribute("aria-expanded", "true");
    if (typeof panel.showPopover === "function") {
      panel.setAttribute("popover", "manual");
      panel.showPopover();
    }
    place(d);
    if (typeof ResizeObserver !== "undefined") {
      item.resize = new ResizeObserver(() => place(d));
      item.resize.observe(panel);
    }
    item.mutation = new win.MutationObserver(() => {
      if (!d.open) clean(d);
      else place(d);
    });
    item.mutation.observe(d, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ["open"],
    });
  };
  const toggle = (e: Event) => {
    const target = e.target;
    if (!(target instanceof win.HTMLDetailsElement)) return;
    if (target.matches("details.stc-check-picker")) {
      if (target.open) open(target);
      else clean(target);
    } else {
      const parent = target.closest<HTMLDetailsElement>(
        "details.stc-check-picker",
      );
      if (parent?.open) place(parent);
    }
  };
  const outside = (e: Event) => {
    const target = e.target;
    if (!(target instanceof win.Node)) return;
    for (const d of active()) if (!d.contains(target)) close(d);
  };
  const key = (e: KeyboardEvent) => {
    if (e.key !== "Escape") return;
    const d = active().at(-1);
    if (d) {
      e.preventDefault();
      close(d, true);
    }
  };
  const change = (e: Event) => {
    if (!(e.target instanceof win.HTMLSelectElement)) return;
    const d = e.target.closest<HTMLDetailsElement>("details.stc-check-picker");
    if (d) close(d);
  };
  const position = () => {
    for (const d of entries.keys()) place(d);
  };
  const observer = new win.MutationObserver(() => {
    for (const d of entries.keys()) if (!d.isConnected) clean(d);
  });
  observer.observe(doc.body, { subtree: true, childList: true });
  doc.addEventListener("toggle", toggle, true);
  doc.addEventListener("pointerdown", outside, true);
  doc.addEventListener("focusin", outside, true);
  doc.addEventListener("keydown", key);
  doc.addEventListener("change", change);
  win.addEventListener("resize", position);
  win.addEventListener("scroll", position, true);
  win.visualViewport?.addEventListener("resize", position);
  for (const d of active()) open(d);
  return () => {
    for (const d of [...entries.keys()]) close(d);
    observer.disconnect();
    doc.removeEventListener("toggle", toggle, true);
    doc.removeEventListener("pointerdown", outside, true);
    doc.removeEventListener("focusin", outside, true);
    doc.removeEventListener("keydown", key);
    doc.removeEventListener("change", change);
    win.removeEventListener("resize", position);
    win.removeEventListener("scroll", position, true);
    win.visualViewport?.removeEventListener("resize", position);
  };
}
/** Native popover top layer preserves React/DOM ancestry and escapes scrolling containers. */
export function useLuaChonNoi() {
  useEffect(() => {
    if (users++ === 0) dispose = install(document);
    return () => {
      if (--users === 0) {
        dispose?.();
        dispose = undefined;
      }
    };
  }, []);
}

export function useBamNgoai(
  open: boolean,
  selector: string,
  onClose: () => void,
) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    if (!open) return;
    const outside = (e: Event) => {
      const target = e.target;
      if (target instanceof window.Element && !target.closest(selector))
        close.current();
    };
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
    };
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("focusin", outside, true);
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("pointerdown", outside, true);
      document.removeEventListener("focusin", outside, true);
      document.removeEventListener("keydown", key);
    };
  }, [open, selector]);
}
