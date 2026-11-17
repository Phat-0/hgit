import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { ChiNhanhBanDo } from "./GioiThieuLuuTru";
export default function BanDoChanTrang({
  chiNhanh,
}: {
  chiNhanh: ChiNhanhBanDo[];
}) {
  const node = useRef<HTMLDivElement>(null),
    [selected, setSelected] = useState("");
  const valid = chiNhanh.filter(
    (b) =>
      b.vi_do !== null &&
      b.kinh_do !== null &&
      b.vi_do !== "" &&
      b.kinh_do !== "" &&
      Number.isFinite(Number(b.vi_do)) &&
      Number.isFinite(Number(b.kinh_do)) &&
      Math.abs(Number(b.vi_do)) <= 90 &&
      Math.abs(Number(b.kinh_do)) <= 180,
  );
  const key = valid
    .map((b) => [b.id, b.vi_do, b.kinh_do, b.ten_homestay].join(":"))
    .join("|");
  useEffect(() => {
    if (!node.current || !valid.length) return;
    const map = L.map(node.current, { scrollWheelZoom: false });
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap contributors",
    }).addTo(map);
    const points = valid.filter((b) => !selected || b.id === selected);
    const group = L.featureGroup(
      points.map((b) => {
        const label = document.createElement("div");
        const title = document.createElement("strong");
        title.textContent = b.ten_homestay;
        const address = document.createElement("p");
        address.textContent = b.dia_chi;
        label.append(title, address);
        return L.circleMarker([Number(b.vi_do), Number(b.kinh_do)], {
          radius: 8,
          color: "#76512b",
          fillColor: "#e9bd80",
          fillOpacity: 1,
        }).bindPopup(label);
      }),
    ).addTo(map);
    if (points.length === 1)
      map.setView([Number(points[0].vi_do), Number(points[0].kinh_do)], 15);
    else map.fitBounds(group.getBounds(), { padding: [32, 32], maxZoom: 15 });
    const resize = new ResizeObserver(() => map.invalidateSize());
    resize.observe(node.current);
    return () => {
      resize.disconnect();
      map.remove();
    };
  }, [key, selected]);
  return (
    <section className="kh-footer-map" aria-label="Bản đồ chi nhánh">
      <div>
        <strong>Tìm đường đến HomeStay</strong>
        {valid.length > 1 && (
          <select
            aria-label="Chi nhánh trên bản đồ"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            <option value="">Tất cả chi nhánh</option>
            {valid.map((b) => (
              <option key={b.id} value={b.id}>
                {b.ten_homestay}
              </option>
            ))}
          </select>
        )}
      </div>
      {valid.length ? (
        <div ref={node} className="kh-map-canvas" />
      ) : (
        <p>
          Chưa có tọa độ chi nhánh. Bạn có thể xem địa chỉ trong thông tin liên
          hệ.
        </p>
      )}
    </section>
  );
}
