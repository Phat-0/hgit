import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import L from "leaflet";
import { khoangCachKm } from "./khoang-cach-chi-nhanh";
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
  initialOrigin = null,
  onClose,
}: {
  branches: ChiNhanhBanDo[];
  initial: string;
  initialOrigin?: Point | null;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<string[]>(
      initial ? [initial] : branches.map((b) => b.id),
    ),
    [origin, setOrigin] = useState<Point | null>(initialOrigin),
    [status, setStatus] = useState(
      "Chọn điểm xuất phát trên bản đồ hoặc dùng vị trí của bạn.",
    ),
    [summary, setSummary] = useState(""),
    [road, setRoad] = useState<Record<string, number>>({}),
    [routeRequest, setRouteRequest] = useState(0),
    [showDirections, setShowDirections] = useState(false),
    [routeBranch, setRouteBranch] = useState("");
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
      setRouteRequest(0);
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
    if (!routeRequest || !routeBranch) return;
    const controller = new AbortController(),
      timeout = setTimeout(() => controller.abort(), 12000);
    let active = true;
    setStatus("Đang tìm tuyến đường…");
    const coordinates = [
      origin,
      ...branches.filter((b) => b.id === routeBranch).map(coord),
    ]
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
  }, [origin?.join(","), selected.join("|"), key, routeRequest, routeBranch]);
  useEffect(() => {
    setRoad({});
    if (!origin || !branches.length) return;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 10000);
    let current = true;
    const list = [origin, ...branches.map(coord)]
      .map(([lat, lng]) => lng + "," + lat)
      .join(";");
    void fetch(
      "https://router.project-osrm.org/table/v1/driving/" +
        list +
        "?sources=0&annotations=distance",
      { signal: controller.signal },
    )
      .then(async (r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (
          !current ||
          data.code !== "Ok" ||
          !Array.isArray(data.distances?.[0])
        )
          return;
        setRoad(
          Object.fromEntries(
            branches.flatMap((b, i) =>
              typeof data.distances[0][i + 1] === "number"
                ? [[b.id, data.distances[0][i + 1] / 1000]]
                : [],
            ),
          ),
        );
      })
      .catch(() => {})
      .finally(() => clearTimeout(timer));
    return () => {
      current = false;
      controller.abort();
      clearTimeout(timer);
    };
  }, [origin?.join(","), key]);
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
        setRouteRequest(0);
        setOrigin([p.coords.latitude, p.coords.longitude]);
        setStatus("Đã lấy vị trí hiện tại.");
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
        <button
          className="kh-map-close"
          type="button"
          onClick={onClose}
          aria-label="Đóng bản đồ"
        >
          ×
        </button>
        <div className="kh-map-layout">
          <aside>
            <section className="kh-map-group">
              <h3>Chi nhánh hiển thị</h3>
              <label>
                <input
                  type="checkbox"
                  aria-label="Tất cả chi nhánh"
                  checked={selected.length === branches.length}
                  onChange={(e) => {
                    setRouteRequest(0);
                    setSelected(
                      e.target.checked ? branches.map((b) => b.id) : [],
                    );
                  }}
                />
                Tất cả chi nhánh
              </label>
              {branches.map((b) => (
                <label key={b.id}>
                  <input
                    type="checkbox"
                    checked={selected.includes(b.id)}
                    onChange={(e) => {
                      setRouteRequest(0);
                      setSelected(
                        e.target.checked
                          ? [...selected, b.id]
                          : selected.filter((id) => id !== b.id),
                      );
                    }}
                  />
                  <span>
                    {b.ten_homestay}
                    <small>{b.dia_chi}</small>
                  </span>
                </label>
              ))}
            </section>
            <section className="kh-map-group">
              <h3>Khoảng cách từ bạn</h3>
              <button type="button" onClick={locate}>
                {origin ? "Cập nhật vị trí" : "Cho phép tìm vị trí hiện tại"}
              </button>
              {!origin && (
                <p role="status">
                  Cho phép truy cập vị trí để xem khoảng cách đến từng chi
                  nhánh.
                </p>
              )}
              {origin && (
                <ul className="kh-map-distances">
                  {branches.map((b) => (
                    <li key={b.id}>
                      <span>{b.ten_homestay}</span>
                      <strong>
                        {!origin
                          ? "Chưa có vị trí"
                          : road[b.id] != null
                            ? road[b.id].toLocaleString("vi-VN", {
                                maximumFractionDigits: 1,
                              }) + " km"
                            : "≈ " +
                              khoangCachKm(origin, coord(b)).toLocaleString(
                                "vi-VN",
                                { maximumFractionDigits: 1 },
                              ) +
                              " km"}
                      </strong>
                    </li>
                  ))}
                </ul>
              )}
              {origin && branches.some((b) => road[b.id] == null) && (
                <small>
                  ≈ Khoảng cách đường thẳng khi chưa tải được đường bộ.
                </small>
              )}
            </section>
            <section className="kh-map-group">
              <h3>Dẫn đường</h3>
              <button
                type="button"
                className="kh-map-directions"
                aria-expanded={showDirections}
                onClick={() => setShowDirections((v) => !v)}
              >
                Dẫn đường →
              </button>
              {showDirections && (
                <select
                  aria-label="Chi nhánh dẫn đường"
                  value={routeBranch}
                  onChange={(e) => {
                    setRouteBranch(e.target.value);
                    if (e.target.value) {
                      setSelected((ids) =>
                        ids.includes(e.target.value)
                          ? ids
                          : [...ids, e.target.value],
                      );
                      setRouteRequest((n) => n + 1);
                    }
                  }}
                >
                  <option value="">Chọn chi nhánh</option>
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.ten_homestay}
                    </option>
                  ))}
                </select>
              )}
              <p role="status">{status}</p>
              {summary && (
                <strong className="kh-route-summary">{summary}</strong>
              )}
              {routeBranch && branches.some((b) => b.id === routeBranch) && (
                <a
                  href={duongDi(
                    branches.find((b) => b.id === routeBranch)!,
                    origin,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Mở ứng dụng bản đồ ↗
                </a>
              )}
            </section>
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
    [expanded, setExpanded] = useState(false),
    node = useRef<HTMLDivElement>(null);
  const key = valid.map((b) => [b.id, b.vi_do, b.kinh_do].join(":")).join("|");
  const selected = branch || "*";
  const chosen =
    selected === "*" ? valid : valid.filter((b) => b.id === selected);
  useEffect(() => {
    if (!node.current || !chosen.length) return;
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
    chosen.forEach((b) =>
      L.circleMarker(coord(b), {
        radius: 7,
        color: "#76512b",
        fillColor: "#e9bd80",
        fillOpacity: 1,
      })
        .addTo(map)
        .bindTooltip(b.ten_homestay),
    );
    if (chosen.length === 1) map.setView(coord(chosen[0]), 14);
    else
      map.fitBounds(L.latLngBounds(chosen.map(coord)), {
        padding: [20, 20],
        maxZoom: 14,
      });
    const observer = new ResizeObserver(() => map.invalidateSize());
    observer.observe(node.current);
    return () => {
      observer.disconnect();
      map.remove();
    };
  }, [selected, key]);

  return (
    <section className="kh-footer-map" aria-label="Bản đồ chi nhánh">
      {chosen.length ? (
        <div className="kh-map-preview">
          <div ref={node} className="kh-map-canvas" />
          <button
            type="button"
            className="kh-map-open"
            onClick={() => setExpanded(true)}
            aria-label="Mở bản đồ chi nhánh"
          ></button>
        </div>
      ) : (
        <p>Chi nhánh chưa có tọa độ.</p>
      )}
      {expanded && valid.length > 0 && (
        <BanDoMoRong
          branches={valid}
          initial={
            selected !== "*" && valid.some((b) => b.id === selected)
              ? selected
              : ""
          }
          onClose={() => setExpanded(false)}
        />
      )}
    </section>
  );
}
