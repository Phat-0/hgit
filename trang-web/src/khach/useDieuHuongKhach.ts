import { useEffect, useState } from "react";
const current = () => location.pathname + location.search + location.hash;
const internal = (u: URL) =>
  u.origin === location.origin &&
  /^\/(?:$|phong-gia\/?$|uu-dai-combo\/?$|phong\/[^/]+\/?$|ket-qua-phong\/?$)/.test(
    u.pathname,
  );
export function denTrangKhach(href: string) {
  const u = new URL(href, location.href);
  if (!internal(u)) {
    location.assign(href);
    return;
  }
  if (u.href === location.href) return;
  history.replaceState({ ...history.state, khScrollY: scrollY }, "");
  history.pushState({ khScrollY: 0 }, "", u);
  dispatchEvent(new Event("homestay:dieu-huong"));
}
export default function useDieuHuongKhach() {
  const [route, setRoute] = useState(current);
  useEffect(() => {
    let frame = 0;
    const update = (back = false) => {
      setRoute(current());
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (location.hash) {
          const target = document.getElementById(
            decodeURIComponent(location.hash.slice(1)),
          );
          if (target) {
            target.scrollIntoView({ behavior: "instant", block: "start" });
            return;
          }
        }
        window.scrollTo({
          top: back ? Number(history.state?.khScrollY || 0) : 0,
          behavior: "instant",
        });
      });
    };
    const pop = () => update(true),
      go = () => update();
    const click = (e: MouseEvent) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      )
        return;
      const a = (e.target as Element).closest?.(
        "a[href]",
      ) as HTMLAnchorElement | null;
      if (
        !a ||
        a.hasAttribute("download") ||
        (a.target && a.target !== "_self")
      )
        return;
      const u = new URL(a.href, location.href);
      if (!internal(u)) return;
      e.preventDefault();
      denTrangKhach(a.href);
    };
    addEventListener("popstate", pop);
    addEventListener("homestay:dieu-huong", go);
    document.addEventListener("click", click);
    return () => {
      cancelAnimationFrame(frame);
      removeEventListener("popstate", pop);
      removeEventListener("homestay:dieu-huong", go);
      document.removeEventListener("click", click);
    };
  }, []);
  return route;
}
