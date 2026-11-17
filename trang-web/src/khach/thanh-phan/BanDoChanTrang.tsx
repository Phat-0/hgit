import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ChiNhanhBanDo } from "./GioiThieuLuuTru";
type Point = [number, number];
function points(items: ChiNhanhBanDo[]) {
  return items.filter(
    (b) =>
      b.vi_do != null &&
      b.kinh_do != null &&
      b.vi_do !== "" &&
      b.kinh_do !== "" &&
      Number.isFinite(Number(b.vi_do)) &&
      Number.isFinite(Number(b.kinh_do)) &&
      Math.abs(Number(b.vi_do)) <= 90 &&
      Math.abs(Number(b.kinh_do)) <= 180,
  );
}
const coord = (b: ChiNhanhBanDo): Point => [Number(b.vi_do), Number(b.kinh_do)];
function duongDi(b: ChiNhanhBanDo, origin: Point | null) {
  const params = new URLSearchParams({
    api: "1",
    destination: coord(b).join(","),
    travelmode: "driving",
  });
  if (origin) params.set("origin", origin.join(","));
  return "https://www.google.com/maps/dir/?" + params;
}
function BanDoMoRong({
  branches,
  initial,
  onClose,
}: {
  branches: ChiNhanhBanDo[];
  initial: string;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(
      initial ? [initial] : branches.map((b) => b.id),
    ),
    [origin, setOrigin] = useState<Point | null>(null),
    [status, setStatus] = useState(
      "Chọn điểm xuất phát trên bản đồ hoặc dùng vị trí của bạn.",
    ),
    [summary, setSummary] = useState("");
  const node = useRef<HTMLDivElement>(null),
    mapRef = useRef<L.Map | null>(null),
    routeRef = useRef<L.Polyline | null>(null),
    startRef = useRef<L.CircleMarker | null>(null),
    dialog = useRef<HTMLElement>(null),
    closeRef = useRef(onClose);
  closeRef.current = onClose;
  const selectedBranches = branches.filter((b) => selected.includes(b.id)),
    key = branches.map((b) => [b.id, b.vi_do, b.kinh_do].join(":")).join("|");
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeRef.current();
      if (e.key === "Tab") {
        const items = Array.from(
            dialog.current?.querySelectorAll<HTMLElement>(
              'button:not(:disabled),a[href],input,[tabindex="0"]',
            ) || [],
          ),
          first = items[0],
          last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", escape);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", escape);
      previous?.focus();
    };
  }, []);
  useEffect(() => {
    if (!node.current) return;
    const map = L.map(node.current, { scrollWheelZoom: true });
    mapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    const markers = branches
      .filter((b) => selected.includes(b.id))
      .map((b) => {
        const popup = document.createElement("div"),
          title = document.createElement("strong"),
          address = document.createElement("p"),
          link = document.createElement("a");
        title.textContent = b.ten_homestay;
        address.textContent = b.dia_chi;
        link.textContent = "Chỉ đường đến đây";
        link.href = duongDi(b, null);
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        popup.append(title, address, link);
        return L.circleMarker(coord(b), {
          radius: 9,
          color: selected.includes(b.id) ? "#9e6c30" : "#777",
          fillColor: selected.includes(b.id) ? "#e9bd80" : "#ccc",
          fillOpacity: 1,
        })
          .addTo(map)
          .bindPopup(popup);
      });
    const chosen = branches.filter((b) => selected.includes(b.id));
    if (chosen.length === 1) map.setView(coord(chosen[0]), 15);
    else
      map.fitBounds(
        L.latLngBounds((chosen.length ? chosen : branches).map(coord)),
        { padding: [48, 48], maxZoom: 15 },
      );
    map.on("click", (e) => {
      setOrigin([e.latlng.lat, e.latlng.lng]);
      setStatus("Đã chọn điểm xuất phát.");
    });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(node.current);
    return () => {
      observer.disconnect();
      markers.forEach((m) => m.remove());
      map.remove();
      mapRef.current = null;
      routeRef.current = null;
      startRef.current = null;
    };
  }, [key, selected.join("|")]);
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    routeRef.current?.remove();
    routeRef.current = null;
    startRef.current?.remove();
    startRef.current = null;
    setSummary("");
    if (!origin || !selectedBranches.length) return;
    startRef.current = L.circleMarker(origin, {
      radius: 8,
      color: "#1c6e9e",
      fillColor: "#58b3e4",
      fillOpacity: 1,
    })
      .addTo(map)
      .bindTooltip("Điểm xuất phát");
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 12000);
    let active = true;
    setStatus("Đang tìm tuyến đường…");
    const coordinates = [origin, ...selectedBranches.map(coord)]
      .map(([lat, lng]) => lng + "," + lat)
      .join(";");
    void fetch(
      "https://router.project-osrm.org/route/v1/driving/" +
        coordinates +
        "?overview=full&geometries=geojson",
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (!active) return;
        const route = data.routes?.[0];
        if (data.code !== "Ok" || !route?.geometry?.coordinates?.length)
          throw Error();
        const line = L.polyline(
          route.geometry.coordinates.map(([lng, lat]: number[]) => [lat, lng]),
          { color: "#387dab", weight: 5, opacity: 0.85 },
        ).addTo(map);
        routeRef.current = line;
        map.fitBounds(line.getBounds(), { padding: [40, 40] });
        setSummary(
          (route.distance / 1000).toLocaleString("vi-VN", {
            maximumFractionDigits: 1,
          }) +
            " km · khoảng " +
            Math.ceil(route.duration / 60) +
            " phút",
        );
        setStatus(
          "Tuyến ô tô qua các chi nhánh đã chọn, theo thứ tự danh sách.",
        );
      })
      .catch(() => {
        if (active)
          setStatus(
            "Chưa tải được tuyến đường. Bạn có thể mở Chỉ đường để tiếp tục trên ứng dụng bản đồ.",
          );
      })
      .finally(() => clearTimeout(timeout));
    return () => {
      active = false;
      controller.abort();
      clearTimeout(timeout);
    };
  }, [origin?.join(","), selected.join("|"), key]);
  function locate() {
    if (!navigator.geolocation) {
      setStatus(
        "Trình duyệt chưa hỗ trợ vị trí. Hãy chọn điểm xuất phát trên bản đồ.",
      );
      return;
    }
    setStatus("Đang lấy vị trí…");
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setOrigin([p.coords.latitude, p.coords.longitude]);
      },
      () =>
        setStatus(
          "Chưa lấy được vị trí. Bạn có thể nhấn trên bản đồ để chọn điểm xuất phát.",
        ),
      { timeout: 10000, maximumAge: 60000 },
    );
  }
  return createPortal(
    <div
      className="kh-map-shade"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        ref={dialog}
        className="kh-map-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Bản đồ và đường đi"
      >
        <header>
          <h2>Chi nhánh & đường đi</h2>
          <button type="button" onClick={onClose} aria-label="Đóng bản đồ">
            ×
          </button>
        </header>
        <div className="kh-map-layout">
          <aside>
            <p>Hiện một hoặc nhiều chi nhánh</p>
            <button
              type="button"
              onClick={() =>
                setSelected(
                  selected.length === branches.length
                    ? []
                    : branches.map((b) => b.id),
                )
              }
            >
              {selected.length === branches.length
                ? "Bỏ chọn tất cả"
                : "Chọn tất cả"}
            </button>
            {branches.map((b) => (
              <label key={b.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(b.id)}
                  onChange={(e) =>
                    setSelected(
                      e.target.checked
                        ? [...selected, b.id]
                        : selected.filter((id) => id !== b.id),
                    )
                  }
                />
                <span>
                  {b.ten_homestay}
                  <small>{b.dia_chi}</small>
                  {selected.includes(b.id) && (
                    <a
                      href={duongDi(b, origin)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Chỉ đường ↗
                    </a>
                  )}
                </span>
              </label>
            ))}
            <button type="button" onClick={locate}>
              Dùng vị trí của tôi
            </button>
            {origin && (
              <button type="button" onClick={() => setOrigin(null)}>
                Bỏ điểm xuất phát
              </button>
            )}
            <p role="status">{status}</p>
            {summary && <strong className="kh-route-summary">{summary}</strong>}
          </aside>
          <div ref={node} className="kh-map-expanded" />
        </div>
      </section>
    </div>,
    document.body,
  );
}
export default function BanDoChanTrang({
  chiNhanh,
  branch,
}: {
  chiNhanh: ChiNhanhBanDo[];
  branch?: string;
}) {
  const valid = points(chiNhanh),
    [index, setIndex] = useState(0),
    [expanded, setExpanded] = useState(false),
    node = useRef<HTMLDivElement>(null);
  const key = valid.map((b) => [b.id, b.vi_do, b.kinh_do].join(":")).join("|");
  const active = branch
    ? valid.find((b) => b.id === branch)
    : valid[index % Math.max(1, valid.length)];
  useEffect(() => {
    setIndex(0);
    if (
      branch ||
      valid.length < 2 ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    )
      return;
    const timer = setInterval(() => {
      if (!document.hidden && !expanded) setIndex((i) => i + 1);
    }, 6000);
    return () => clearInterval(timer);
  }, [branch, key, expanded]);
  useEffect(() => {
    if (!node.current || !active) return;
    const map = L.map(node.current, {
      scrollWheelZoom: false,
      dragging: false,
      zoomControl: false,
      doubleClickZoom: false,
      boxZoom: false,
      keyboard: false,
      touchZoom: false,
    });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    valid.forEach((b) =>
      L.circleMarker(coord(b), {
        radius: b.id === active.id ? 8 : 5,
        color: "#76512b",
        fillColor: "#e9bd80",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(b.ten_homestay),
    );
    map.setView(coord(active), 14);
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(node.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [active?.id, key]);
  return (
    <section className="kh-footer-map" aria-label="Bản đồ chi nhánh">
      <strong>Tìm đường đến HomeStay</strong>
      {active ? (
        <>
          <div className="kh-map-preview">
            <div ref={node} className="kh-map-canvas" />
            <button
              type="button"
              className="kh-map-open"
              onClick={() => setExpanded(true)}
              aria-label="Mở bản đồ và đường đi"
            >
              <span>Xem chi nhánh & chỉ đường ↗</span>
            </button>
          </div>
          <small>
            {active.ten_homestay}
            {!branch && valid.length > 1
              ? " · " + ((index % valid.length) + 1) + "/" + valid.length
              : ""}
          </small>
          {branch && !valid.some((b) => b.id === branch) && (
            <small>Chi nhánh đã chọn chưa có tọa độ.</small>
          )}
        </>
      ) : (
        <p>Chưa có tọa độ chi nhánh. Vui lòng xem địa chỉ liên hệ.</p>
      )}
      {expanded && (
        <BanDoMoRong
          branches={valid}
          initial={branch && valid.some((b) => b.id === branch) ? branch : ""}
          onClose={() => setExpanded(false)}
        />
      )}
    </section>
  );
}
