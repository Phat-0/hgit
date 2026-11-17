import { useState } from "react";
import {
  ChonSapXep,
  xepDanhSach,
  type PhongKhach,
  type SapXep,
} from "./GioiThieuLuuTru";
export default function KetQuaTimPhong({
  rooms,
  loading,
  full = false,
  onXem,
  onTatCa,
}: {
  rooms: PhongKhach[];
  loading: boolean;
  full?: boolean;
  onXem: (room: PhongKhach) => void;
  onTatCa?: () => void;
}) {
  const [sort, setSort] = useState<SapXep>("noi-bat");
  const sorted = xepDanhSach(
    rooms,
    sort,
    [],
    (r) => r.ten_phong,
    (r) => Number(r.tien_phong),
    (r) => r.luot_dat || 0,
  );
  const groups = full
    ? [
        ...new Map(
          sorted.map((p) => [p.homestay_id || p.ten_homestay, p.ten_homestay]),
        ).entries(),
      ]
        .sort((a, b) => a[1].localeCompare(b[1], "vi"))
        .map(([id, name]) => ({
          id,
          name,
          rooms: sorted.filter((p) => (p.homestay_id || p.ten_homestay) === id),
        }))
    : [{ id: "preview", name: "", rooms: sorted.slice(0, 10) }];
  return (
    <section
      id={full ? "kh-results-all" : "ket-qua-phong"}
      className={"kh-results " + (full ? "kh-results-full" : "")}
      aria-label="Kết quả phòng trống"
    >
      <header>
        <h2>
          {full ? "Danh sách phòng trống" : "Phòng trống phù hợp"}{" "}
          <small>{rooms.length} phòng</small>
        </h2>
        {full && (
          <ChonSapXep
            label="Sắp xếp kết quả tìm phòng"
            value={sort}
            onChange={setSort}
          />
        )}
      </header>
      {loading && <p role="status">Đang kiểm tra phòng…</p>}
      {!loading && !rooms.length && (
        <p>Chưa có phòng trống phù hợp. Vui lòng đổi lịch hoặc chi nhánh.</p>
      )}
      {groups.map((group) => (
        <div className="kh-result-group" key={group.id}>
          {group.name && <h3>{group.name}</h3>}
          <div className="kh-result-grid">
            {group.rooms.map((p) => (
              <article key={p.id}>
                <button
                  type="button"
                  aria-label={"Xem phòng trống " + p.ten_phong}
                  onClick={() => onXem({ ...p, gia_tham_khao: false })}
                >
                  {p.anh.find(Boolean) ? (
                    <img
                      src={p.anh.find(Boolean)!}
                      alt={p.ten_phong}
                      loading="lazy"
                    />
                  ) : (
                    <span className="kh-result-no-photo">Chưa có ảnh</span>
                  )}
                  <div>
                    <small>{p.ten_homestay}</small>
                    <h3>{p.ten_phong}</h3>
                    <span>{p.suc_chua} khách</span>
                    <strong>
                      {Number(p.tien_phong).toLocaleString("vi-VN")} ₫
                    </strong>
                    <small>Toàn bộ khoảng đặt</small>
                  </div>
                </button>
              </article>
            ))}
          </div>
        </div>
      ))}
      {!full && !loading && rooms.length > 0 && (
        <button type="button" className="kh-results-more" onClick={onTatCa}>
          Xem tất cả {rooms.length} phòng theo chi nhánh →
        </button>
      )}
    </section>
  );
}
