import { useMemo, useState } from "react";
export type PhongKhach = {
  id: string;
  homestay_id?: string;
  ten_phong: string;
  ma_phong: string;
  ten_homestay: string;
  dia_chi: string;
  tinh_thanh: string;
  ten_loai: string;
  mo_ta: string | null;
  suc_chua: number;
  dien_tich_m2: string | null;
  tien_phong: number;
  anh: (string | null)[];
  tien_nghi?: string[];
  gia_moi_ngay?: number;
  gia_moi_dem?: number;
  gia_moi_gio?: number;
  gia_phu_thu_gio?: number;
  so_gio_toi_thieu?: number;
  cho_dat_theo_gio?: boolean;
  cho_dat_theo_ngay?: boolean;
  cho_dat_theo_dem?: boolean;
  anh_chon?: { id: string; url: string | null }[];
  luot_dat?: number;
  gia_tham_khao?: boolean;
};
export type ComboGioiThieu = {
  luot_dat?: number;
  bat_dau?: string | null;
  ket_thuc?: string | null;
  pham_vi?: string;
  chi_nhanh_ids?: string[];
  phong_ids?: string[];
  id: string;
  ten_combo: string;
  mo_ta: string | null;
  gia_combo: number | string;
  so_gio_bao_gom: number | null;
  anh: (string | null)[];
};
export type ChiNhanhBanDo = {
  id: string;
  ten_homestay: string;
  dia_chi: string;
  tinh_thanh: string;
  vi_do: string | null;
  kinh_do: string | null;
};
export type DanhGiaKhach = {
  id: string;
  so_sao: number;
  noi_dung: string | null;
  ten_khach: string;
  ten_phong: string;
  ten_homestay: string;
  ngay_tao: string;
};
export type DuLieuGioiThieu = {
  thong_ke?: { so_homestay: number; so_phong: number; luot_khach: number };
  phong: PhongKhach[];
  combo: ComboGioiThieu[];
  chi_nhanh: ChiNhanhBanDo[];
  danh_gia: DanhGiaKhach[];
};
export type SapXep =
  "noi-bat" | "gia-tang" | "gia-giam" | "ten" | "ten-giam" | "pho-bien";
export function ChonSapXep({
  value,
  onChange,
  label,
}: {
  value: SapXep;
  onChange: (v: SapXep) => void;
  label: string;
}) {
  return (
    <label className="kh-sort">
      Sắp xếp
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value as SapXep)}
      >
        <option value="noi-bat">Nổi bật</option>
        <option value="gia-tang">Giá thấp đến cao</option>
        <option value="gia-giam">Giá cao đến thấp</option>
        <option value="ten">Tên A–Z</option>
        <option value="ten-giam">Tên Z–A</option>
        <option value="pho-bien">Phổ biến nhất</option>
      </select>
    </label>
  );
}
export function xepDanhSach<T extends { id: string }>(
  items: T[],
  sort: SapXep,
  featured: string[],
  name: (x: T) => string,
  price: (x: T) => number,
  popular: (x: T) => number = () => 0,
) {
  return [...items].sort((a, b) =>
    sort === "gia-tang"
      ? price(a) - price(b)
      : sort === "gia-giam"
        ? price(b) - price(a)
        : sort === "ten-giam"
          ? name(b).localeCompare(name(a), "vi")
          : sort === "pho-bien"
            ? popular(b) - popular(a) || name(a).localeCompare(name(b), "vi")
            : sort === "ten"
              ? name(a).localeCompare(name(b), "vi")
              : (featured.includes(b.id) ? 1 : 0) -
                  (featured.includes(a.id) ? 1 : 0) ||
                popular(b) - popular(a) ||
                name(a).localeCompare(name(b), "vi"),
  );
}
const money = (n: number | string) => Number(n).toLocaleString("vi-VN") + " ₫";
export default function GioiThieuLuuTru({
  data,
  page,
  phongNoiBat = [],
  comboNoiBat = [],
  onXem,
  onCombo,
  hienCombo = true,
}: {
  hienCombo?: boolean;
  data: DuLieuGioiThieu;
  page: "home" | "phong" | "combo";
  phongNoiBat?: string[];
  comboNoiBat?: string[];
  tieuDePhong: string;
  tieuDeCombo: string;
  onXem: (p: PhongKhach) => void;
  onCombo: (id: string) => void;
}) {
  const [catalogBranch, setCatalogBranch] = useState("");
  const [comboType, setComboType] = useState("");
  const [activeTab, setActiveTab] = useState<"phong" | "combo">("phong");
  const [roomSort, setRoomSort] = useState<SapXep>("noi-bat"),
    [comboSort, setComboSort] = useState<SapXep>("noi-bat"),
    [search, setSearch] = useState("");
  const rooms = useMemo(
    () =>
      xepDanhSach(
        data.phong.filter(
          (p) =>
            (!catalogBranch || p.homestay_id === catalogBranch) &&
            (p.ten_phong + " " + p.ten_homestay)
              .toLocaleLowerCase("vi")
              .includes(search.toLocaleLowerCase("vi")),
        ),
        roomSort,
        phongNoiBat,
        (p) => p.ten_phong,
        (p) => Number(p.gia_moi_ngay) || 0,
        (p) => Number(p.luot_dat) || 0,
      ),
    [data.phong, roomSort, search, phongNoiBat, catalogBranch],
  );
  const combos = xepDanhSach(
    data.combo.filter(
      (c) =>
        (!catalogBranch ||
          c.pham_vi === "toan_he_thong" ||
          c.pham_vi === "Tất cả" ||
          (c.chi_nhanh_ids || []).includes(catalogBranch) ||
          (c.phong_ids || []).some((id) =>
            data.phong.some(
              (p) => p.id === id && p.homestay_id === catalogBranch,
            ),
          )) &&
        (!comboType ||
          (comboType === "gio"
            ? Number(c.so_gio_bao_gom) > 0
            : !Number(c.so_gio_bao_gom))),
    ),
    comboSort,
    comboNoiBat,
    (c) => c.ten_combo,
    (c) => Number(c.gia_combo),
    (c) => c.luot_dat || 0,
  );
  const shownRooms = page === "home" ? rooms.slice(0, 3) : rooms,
    shownCombos = page === "home" ? combos.slice(0, 3) : combos;
  return (
    <div
      className={"kh-showcases " + (page === "home" ? "kh-showcases-home" : "")}
    >
      {page === "home" && (
        <div
          className="kh-showcase-tabs"
          role="tablist"
          aria-label="Giá phòng và Combo"
        >
          <button
            id="kh-room-tab"
            type="button"
            role="tab"
            aria-selected={activeTab === "phong"}
            aria-controls="gioi-thieu-phong"
            onClick={() => setActiveTab("phong")}
          >
            Giá phòng
          </button>
          {hienCombo && (
            <button
              id="kh-combo-tab"
              type="button"
              role="tab"
              aria-selected={activeTab === "combo"}
              aria-controls="combo-khach"
              onClick={() => setActiveTab("combo")}
            >
              Combo
            </button>
          )}
        </div>
      )}
      {page !== "combo" && (
        <section
          id="gioi-thieu-phong"
          className="kh-showcase"
          hidden={page === "home" && activeTab !== "phong"}
          aria-label="Giá phòng"
        >
          <div className="kh-showcase-tools">
            <label className="kh-catalog-branch">
              Chi nhánh
              <select
                aria-label="Chi nhánh của phòng giới thiệu"
                value={catalogBranch}
                onChange={(e) => setCatalogBranch(e.target.value)}
              >
                <option value="">Tất cả chi nhánh</option>
                {data.chi_nhanh.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ten_homestay}
                  </option>
                ))}
              </select>
            </label>
            {page !== "home" && (
              <ChonSapXep
                label="Sắp xếp phòng giới thiệu"
                value={roomSort}
                onChange={setRoomSort}
              />
            )}
            {page === "home" && (
              <a className="kh-view-all" href="/phong-gia">
                Xem tất cả →
              </a>
            )}
            {page === "phong" && (
              <input
                aria-label="Tìm phòng giới thiệu"
                type="search"
                placeholder="Tên phòng hoặc chi nhánh"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            )}
          </div>
          <div className="kh-showcase-cards">
            {shownRooms.map((p) => (
              <article key={p.id} className="kh-feature-card">
                <button
                  onClick={() => onXem({ ...p, gia_tham_khao: true })}
                  aria-label={"Xem chi tiết " + p.ten_phong}
                >
                  {p.anh.find(Boolean) ? (
                    <img
                      draggable={false}
                      src={p.anh.find(Boolean)!}
                      alt={p.ten_phong}
                      loading="lazy"
                    />
                  ) : (
                    <span className="kh-feature-no-photo">
                      Chưa có ảnh phòng
                    </span>
                  )}
                  <div className="kh-feature-caption">
                    <small>{p.ten_homestay}</small>
                    <h3>{p.ten_phong}</h3>
                    <p>
                      {p.suc_chua} khách
                      {p.dien_tich_m2 ? " · " + p.dien_tich_m2 + " m²" : ""}
                    </p>
                    <strong>
                      {Number(p.gia_moi_ngay) > 0
                        ? money(p.gia_moi_ngay!) + " / ngày"
                        : "Liên hệ để xem giá"}
                    </strong>
                    <span>Xem chi tiết →</span>
                  </div>
                  {phongNoiBat.includes(p.id) && (
                    <span className="kh-feature-label">Nổi bật</span>
                  )}
                </button>
              </article>
            ))}
          </div>
          {!shownRooms.length && (
            <p className="kh-empty">Chưa có phòng phù hợp.</p>
          )}
          <small className="kh-reference-price">
            Giá tham khảo theo ngày. Kiểm tra thời gian để xem giá và phòng
            trống.
          </small>
        </section>
      )}
      {page !== "phong" && hienCombo && (
        <section
          id="combo-khach"
          className="kh-showcase"
          hidden={page === "home" && activeTab !== "combo"}
          aria-label="Combo"
        >
          <div className="kh-showcase-tools">
            <label className="kh-catalog-branch">
              Chi nhánh
              <select
                aria-label="Chi nhánh của combo"
                value={catalogBranch}
                onChange={(e) => setCatalogBranch(e.target.value)}
              >
                <option value="">Tất cả chi nhánh</option>
                {data.chi_nhanh.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.ten_homestay}
                  </option>
                ))}
              </select>
            </label>
            <label className="kh-catalog-branch">
              Loại combo
              <select
                aria-label="Phân loại combo"
                value={comboType}
                onChange={(e) => setComboType(e.target.value)}
              >
                <option value="">Tất cả combo</option>
                <option value="gio">Theo giờ</option>
                <option value="dich-vu">Dịch vụ</option>
              </select>
            </label>
            {page === "home" && (
              <a className="kh-view-all" href="/uu-dai-combo">
                Xem tất cả →
              </a>
            )}
            {page !== "home" && (
              <ChonSapXep
                label="Sắp xếp combo giới thiệu"
                value={comboSort}
                onChange={setComboSort}
              />
            )}
          </div>
          <div className="kh-showcase-cards">
            {shownCombos.map((c) => (
              <article key={c.id} className="kh-feature-card">
                <button
                  onClick={() => onCombo(c.id)}
                  aria-label={"Xem combo " + c.ten_combo}
                >
                  {c.anh.find(Boolean) ? (
                    <img
                      src={c.anh.find(Boolean)!}
                      alt={c.ten_combo}
                      loading="lazy"
                    />
                  ) : (
                    <span className="kh-feature-no-photo">
                      Chưa có ảnh combo
                    </span>
                  )}
                  <div className="kh-feature-caption">
                    <small>
                      {c.so_gio_bao_gom
                        ? "Combo " + c.so_gio_bao_gom + " giờ"
                        : "Combo dịch vụ"}
                    </small>
                    <h3>{c.ten_combo}</h3>
                    <p>{c.mo_ta}</p>
                    <strong>{money(c.gia_combo)}</strong>
                    <span>Chọn lịch áp dụng →</span>
                  </div>
                  {comboNoiBat.includes(c.id) && (
                    <span className="kh-feature-label">Nổi bật</span>
                  )}
                </button>
              </article>
            ))}
          </div>
          {!shownCombos.length && (
            <p className="kh-empty">Chưa có combo đang bán.</p>
          )}
          <small className="kh-reference-price">
            Giá combo; tổng tiền phòng và dịch vụ được xác nhận theo lịch.
          </small>
        </section>
      )}
    </div>
  );
}
export function DanhGiaTrangChu({
  items,
  title = "Khách hàng nói về HomeStay",
}: {
  items: DanhGiaKhach[];
  title?: string;
}) {
  return (
    <section className="kh-reviews" aria-label="Đánh giá khách hàng">
      <header>
        <h2>{title}</h2>
      </header>
      <div className="kh-review-track">
        {items.map((d) => (
          <article key={d.id}>
            <header>
              <span className="kh-review-avatar" aria-hidden="true">
                {d.ten_khach[0]}
              </span>
              <div>
                <h3>{d.ten_khach}</h3>
                <small>{d.ten_homestay}</small>
              </div>
            </header>
            <div
              className="kh-review-stars"
              aria-label={d.so_sao + " trên 5 sao"}
            >
              {"★".repeat(d.so_sao)}
              {"☆".repeat(5 - d.so_sao)}
            </div>
            <p>{d.noi_dung || "Khách đã đánh giá trải nghiệm lưu trú."}</p>
            <footer>
              <small>{d.ten_phong}</small>
              <time dateTime={d.ngay_tao}>
                {new Date(d.ngay_tao).toLocaleDateString("vi-VN")}
              </time>
            </footer>
          </article>
        ))}
      </div>
      {!items.length && (
        <p className="kh-empty">Chưa có đánh giá được công khai.</p>
      )}
    </section>
  );
}
