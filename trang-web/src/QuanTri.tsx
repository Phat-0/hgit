import TongQuan from "./TongQuan";
import BaoCao from "./BaoCao";
import DanhGia from "./DanhGia";
import ThongBaoDon from "./ThongBaoDon";
import "./thong-bao-don.css";
import TrangChuQuanTri from "./TrangChuQuanTri";
import NhanVien from "./NhanVien";
import TroChuyen from "./TroChuyen";
import { useEffect, useState } from "react";
import PhongPage from "./Phong.js";
import LichPhong from "./LichPhong.js";
import DonDatPhong from "./DonDatPhong.js";
import GoiGiaCombo from "./GoiGiaCombo.js";
import LoaiPhongPage from "./LoaiPhong.js";
import ChiNhanhPage from "./ChiNhanh.js";

type Login = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  nguoi_dung: { id: string; email: string };
};
type SavedSession = { refresh_token: string; email: string; remember: boolean };
const SESSION_KEY = "homestay_admin_session";
function stored(): SavedSession | null {
  try {
    const raw =
      localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as SavedSession) : null;
  } catch {
    return null;
  }
}
function persist(x: SavedSession) {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
  (x.remember ? localStorage : sessionStorage).setItem(
    SESSION_KEY,
    JSON.stringify(x),
  );
}
function clearSaved() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

type Muc =
  | "tong-quan"
  | "lich"
  | "chi-nhanh"
  | "phong"
  | "loai-phong"
  | "goi-combo"
  | "dat-phong"
  | "trang-chu"
  | "nhan-vien"
  | "danh-gia"
  | "bao-cao"
  | "thong-tin"
  | "tin-nhan";
const danhMuc: { id: Muc; nhan: string; icon: string }[] = [
  { id: "tong-quan", nhan: "Tổng quan", icon: "▦" },
  { id: "lich", nhan: "Lịch", icon: "▣" },
  { id: "chi-nhanh", nhan: "Chi nhánh", icon: "▥" },
  { id: "phong", nhan: "Phòng", icon: "▤" },
  { id: "loai-phong", nhan: "Loại phòng", icon: "▥" },
  { id: "goi-combo", nhan: "Combo", icon: "◈" },
  { id: "dat-phong", nhan: "Đơn đặt phòng", icon: "▣" },
  { id: "trang-chu", nhan: "Trang chủ", icon: "⌂" },
  { id: "nhan-vien", nhan: "Nhân viên", icon: "♙" },
  { id: "tin-nhan", nhan: "Tin nhắn", icon: "☏" },
  { id: "danh-gia", nhan: "Đánh giá", icon: "★" },
  { id: "bao-cao", nhan: "Báo cáo thống kê", icon: "▥" },
  { id: "thong-tin", nhan: "Thông tin cá nhân", icon: "♙" },
];
async function api<T>(
  url: string,
  method = "GET",
  body?: unknown,
  token?: string,
): Promise<T> {
  const response = await fetch("/api" + url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: "Bearer " + token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => ({}))) as {
    message?: string | string[];
  };
  if (!response.ok)
    throw new Error(
      Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message || "Yêu cầu thất bại (HTTP " + response.status + ")",
    );
  return data as T;
}
export default function QuanTri() {
  const [remember, setRemember] = useState(false);
  const [restoring, setRestoring] = useState(!!stored());
  const [cheDo, setCheDo] = useState<"dang-nhap" | "dang-ky">("dang-nhap");
  const [email, setEmail] = useState("");
  const [matKhau, setMatKhau] = useState("");
  const [roleName, setRoleName] = useState("Nhân viên");
  const [token, setToken] = useState("");
  const [taiKhoan, setTaiKhoan] = useState("");
  const [permissions, setPermissions] = useState<string[]>([]);
  const [linked, setLinked] = useState<{
    tu_ngay?: string;
    den_ngay?: string;
    don_id?: string;
  }>({});
  const [navRevision, setNavRevision] = useState(0);
  function go(page: string, filter: typeof linked = {}) {
    if (!permissions.includes(page)) {
      setThongBao("Bạn chưa được cấp quyền vào mục này");
      return;
    }
    setLinked(filter);
    setNavRevision((v) => v + 1);
    setMuc(page as Muc);
    setMenuMo(false);
  }
  const [thongBao, setThongBao] = useState("");
  const [dangXuLy, setDangXuLy] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false);
  const [muc, setMuc] = useState<Muc>("tong-quan");
  const [menuMo, setMenuMo] = useState(false);
  const [hoSoMo, setHoSoMo] = useState(false);
  const [timMo, setTimMo] = useState(false);
  const [tim, setTim] = useState("");
  useEffect(() => {
    let active = true;
    const saved = stored();
    if (!saved) {
      setRestoring(false);
      return;
    }
    setRemember(saved.remember);
    async function restore() {
      try {
        const login = await api<Login>("/xac-thuc/lam-moi", "POST", {
          refresh_token: saved!.refresh_token,
        });
        const access = await api<{ trang: string[]; vai_tro: string }>(
          "/quan-tri/toi",
          "GET",
          undefined,
          login.access_token,
        );

        if (!active) return;
        persist({
          refresh_token: login.refresh_token,
          email: login.nguoi_dung.email,
          remember: saved!.remember,
        });
        setToken(login.access_token);
        setTaiKhoan(login.nguoi_dung.email);
        setPermissions(access.trang);
        setRoleName(access.vai_tro || "Nhân viên");
        setMuc(
          (access.trang.includes("tong-quan")
            ? "tong-quan"
            : access.trang[0]) as Muc,
        );
      } catch {
        if (active) {
          clearSaved();
          setThongBao(
            "Phiên đăng nhập đã hết hạn hoặc không thể kết nối. Vui lòng đăng nhập lại.",
          );
        }
      } finally {
        if (active) setRestoring(false);
      }
    }
    void restore();
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!token) return;
    let active = true;
    const timer = window.setInterval(
      async () => {
        const saved = stored();
        if (!saved) return;
        try {
          const next = await api<Login>("/xac-thuc/lam-moi", "POST", {
            refresh_token: saved.refresh_token,
          });
          if (!active) return;
          persist({
            refresh_token: next.refresh_token,
            email: next.nguoi_dung.email,
            remember: saved.remember,
          });
          setToken(next.access_token);
        } catch {
          /* Loi mang tam thoi: giu phien, kiem tra lai khi nguoi dung thao tac. */
        }
      },
      40 * 60 * 1000,
    );
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [token]);
  async function xuLy(e: React.FormEvent) {
    e.preventDefault();
    setDangXuLy(true);
    setThongBao("");
    try {
      if (cheDo === "dang-ky") {
        await api("/xac-thuc/dang-ky", "POST", { email, matKhau });
        setThongBao(
          "Đã gửi yêu cầu đăng ký. Hãy xác nhận email. Tài khoản mới không tự động có quyền quản trị.",
        );
        setCheDo("dang-nhap");
      } else {
        const login = await api<Login>("/xac-thuc/dang-nhap", "POST", {
          email,
          matKhau,
        });
        const access = await api<{ trang: string[]; vai_tro: string }>(
          "/quan-tri/toi",
          "GET",
          undefined,
          login.access_token,
        );

        persist({
          refresh_token: login.refresh_token,
          email: login.nguoi_dung.email,
          remember,
        });
        setToken(login.access_token);
        setTaiKhoan(login.nguoi_dung.email);
        setPermissions(access.trang);
        setRoleName(access.vai_tro || "Nhân viên");
        setMuc(
          (access.trang.includes("tong-quan")
            ? "tong-quan"
            : access.trang[0]) as Muc,
        );
        setMatKhau("");
      }
    } catch (e) {
      setThongBao(e instanceof Error ? e.message : "Có lỗi xảy ra");
    } finally {
      setDangXuLy(false);
    }
  }
  function thoat() {
    clearSaved();
    setToken("");
    setPermissions([]);
    setTaiKhoan("");
    setThongBao("");
    setMuc("tong-quan");
  }
  return restoring ? (
    <main className="admin-shell">
      <div className="admin-auth">
        <p>Đang khôi phục phiên đăng nhập...</p>
      </div>
    </main>
  ) : !token ? (
    <main className="admin-shell">
      <header className="admin-header">
        <a href="/" className="brand">
          HOMESTAY <b>•</b> ADMIN
        </a>
        <span className="tag">Quản trị hệ thống</span>
      </header>
      <section className="admin-auth">
        <div className="admin-intro">
          <p className="eyebrow">HỆ THỐNG QUẢN TRỊ</p>
          <h1>
            Quản lý Homestay
            <br />
            <em>trong một nơi.</em>
          </h1>
          <p>
            Đăng nhập bằng tài khoản quản trị hoặc nhân viên đã được cấp quyền
            trang. Tài khoản mới đăng ký không tự động có quyền quản trị.
          </p>
        </div>
        <form className="panel admin-form" onSubmit={xuLy}>
          <h2>
            {cheDo === "dang-nhap" ? "Đăng nhập quản lý" : "Đăng ký tài khoản"}
          </h2>
          <p className="sub">Xác thực bằng Supabase Auth</p>
          <label>
            Email
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label>
            Mật khẩu
            <input
              type="password"
              required
              minLength={8}
              maxLength={128}
              autoComplete={
                cheDo === "dang-ky" ? "new-password" : "current-password"
              }
              value={matKhau}
              onChange={(e) => setMatKhau(e.target.value)}
            />
          </label>
          <label className="qt-remember">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />{" "}
            Ghi nhớ đăng nhập trên thiết bị này
          </label>
          <button className="full" disabled={dangXuLy}>
            {dangXuLy
              ? "Đang xử lý..."
              : cheDo === "dang-nhap"
                ? "Đăng nhập"
                : "Đăng ký"}
          </button>
          <button
            className="admin-switch"
            type="button"
            onClick={() => {
              setCheDo(cheDo === "dang-nhap" ? "dang-ky" : "dang-nhap");
              setThongBao("");
            }}
          >
            {cheDo === "dang-nhap"
              ? "Chưa có tài khoản? Đăng ký"
              : "Đã có tài khoản? Đăng nhập"}
          </button>
          {thongBao && (
            <p role="status" className="admin-message">
              {thongBao}
            </p>
          )}
        </form>
      </section>
    </main>
  ) : (
    <div className={"qt-layout " + (sidebarHidden ? "qt-sidebar-hidden" : "")}>
      <aside className={"qt-sidebar " + (menuMo ? "qt-sidebar-open" : "")}>
        <div className="qt-logo">
          <span className="qt-logo-mark">H</span>
          <span>
            Home<span>Stay</span>
          </span>
        </div>
        <button
          type="button"
          className="qt-sidebar-inside-toggle"
          title={sidebarHidden ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          aria-label={sidebarHidden ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
          onClick={() => setSidebarHidden((v) => !v)}
        >
          {sidebarHidden ? "❯" : "❮"}
        </button>
        <div className="qt-menu-scroll">
          {danhMuc
            .filter(
              (item) =>
                item.id !== "thong-tin" && permissions.includes(item.id),
            )
            .map((item) => (
              <button
                type="button"
                key={item.id}
                className={
                  "qt-nav-item " + (muc === item.id ? "qt-nav-active" : "")
                }
                title={sidebarHidden ? item.nhan : undefined}
                aria-label={item.nhan}
                onClick={() => {
                  go(item.id);
                  setMenuMo(false);
                  setThongBao("");
                }}
              >
                <span className="qt-nav-icon">{item.icon}</span>
                <span>{item.nhan}</span>
                <span className="qt-nav-arrow">›</span>
              </button>
            ))}
        </div>
        <div className="qt-sidebar-account">
          <div className="qt-profile-wrap qt-sidebar-profile-wrap">
            <button
              type="button"
              className="qt-profile-button"
              aria-haspopup="menu"
              aria-expanded={hoSoMo}
              onClick={() => setHoSoMo(!hoSoMo)}
            >
              <span className="qt-avatar">
                {taiKhoan.slice(0, 1).toUpperCase()}
              </span>
              <span className="qt-profile-name" title={roleName}>
                {roleName}
              </span>
              <span className="qt-profile-chevron">{hoSoMo ? "⌃" : "⌄"}</span>
            </button>
            {hoSoMo && (
              <>
                <button
                  className="qt-profile-dismiss"
                  aria-label="Đóng menu tài khoản"
                  onClick={() => setHoSoMo(false)}
                />
                <div className="qt-profile-dropdown" role="menu">
                  <div className="qt-profile-email" title={taiKhoan}>
                    {taiKhoan}
                  </div>
                  <button
                    role="menuitem"
                    onClick={() => {
                      setMuc("thong-tin");
                      setHoSoMo(false);
                    }}
                  >
                    ♙ <span>Thông tin cá nhân</span>
                  </button>
                  <button
                    role="menuitem"
                    onClick={() => {
                      go("danh-gia");
                      setHoSoMo(false);
                    }}
                  >
                    ★ <span>Đánh giá</span>
                  </button>
                  <div className="qt-profile-divider" />
                  <button
                    role="menuitem"
                    className="qt-profile-logout"
                    onClick={() => {
                      setHoSoMo(false);
                      thoat();
                    }}
                  >
                    ↪ <span>Đăng xuất</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>
      {menuMo && (
        <button
          className="qt-overlay"
          aria-label="Đóng menu"
          onClick={() => setMenuMo(false)}
        />
      )}
      <div className="qt-workspace">
        <div className="qt-topbar">
          <div className="qt-header-search-row">
            {muc !== "bao-cao" && (
              <h1 className="qt-page-title">
                {muc === "tong-quan"
                  ? "Bảng điều khiển"
                  : danhMuc.find((x) => x.id === muc)?.nhan}
              </h1>
            )}
            <button
              className="qt-mobile-menu"
              onClick={() => setMenuMo(!menuMo)}
              aria-label="Mở menu"
            >
              ☰
            </button>
            {muc === "tong-quan" && (
              <div
                className={
                  "qt-header-search-group " +
                  (timMo ? "qt-search-expanded" : "")
                }
                role="search"
              >
                <button
                  type="button"
                  className="qt-search-toggle"
                  aria-label={timMo ? "Thu gọn tìm kiếm" : "Mở tìm kiếm"}
                  aria-expanded={timMo}
                  onClick={() => {
                    setTimMo(!timMo);
                    if (timMo) setTim("");
                  }}
                >
                  ⌕
                </button>
                {timMo && (
                  <div className="qt-search">
                    <input
                      autoFocus
                      aria-label="Tìm menu"
                      value={tim}
                      onChange={(e) => setTim(e.target.value)}
                      placeholder="Tìm chức năng..."
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          setTimMo(false);
                          setTim("");
                        }
                        if (e.key === "Enter") {
                          const x = danhMuc.find((x) =>
                            x.nhan
                              .toLowerCase()
                              .includes(tim.trim().toLowerCase()),
                          );
                          if (x && tim.trim()) {
                            go(x.id);
                            setTimMo(false);
                            setTim("");
                          }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="qt-top-actions">
            {permissions.includes("dat-phong") && <ThongBaoDon token={token} />}
            {permissions.includes("nhan-vien") && (
              <button
                title="Người dùng"
                aria-label="Người dùng"
                onClick={() => go("nhan-vien")}
                className="qt-icon-button"
              >
                ✉
              </button>
            )}
          </div>
        </div>
        <main
          className={
            "qt-content " + (muc === "tin-nhan" ? "qt-content-chat" : "")
          }
        >
          {thongBao && (
            <div className="qt-alert" role="status">
              {thongBao}
            </div>
          )}
          {muc === "trang-chu" ? (
            <TrangChuQuanTri token={token} />
          ) : muc === "tin-nhan" ? null : muc === "nhan-vien" ? (
            <NhanVien token={token} />
          ) : muc === "chi-nhanh" ? (
            <ChiNhanhPage token={token} />
          ) : muc === "phong" ? (
            <PhongPage token={token} />
          ) : muc === "lich" ? (
            <LichPhong token={token} />
          ) : muc === "dat-phong" ? (
            <DonDatPhong
              key={navRevision}
              token={token}
              initialId={linked.don_id}
              onOpenChat={(thread) => {
                go("tin-nhan");
                window.dispatchEvent(
                  new CustomEvent("homestay:mo-chat", { detail: thread }),
                );
              }}
            />
          ) : muc === "loai-phong" ? (
            <LoaiPhongPage token={token} />
          ) : muc === "goi-combo" ? (
            <GoiGiaCombo token={token} />
          ) : muc === "tong-quan" ? (
            <TongQuan key={navRevision} token={token} onGo={go} />
          ) : muc === "bao-cao" ? (
            <BaoCao
              key={navRevision}
              token={token}
              initial={linked}
              onGo={go}
            />
          ) : muc === "danh-gia" ? (
            <DanhGia key={navRevision} token={token} initial={linked} />
          ) : (
            <section className="qt-placeholder">
              <div className="qt-placeholder-icon">
                {danhMuc.find((x) => x.id === muc)?.icon}
              </div>
              <h2>{danhMuc.find((x) => x.id === muc)?.nhan}</h2>
              {muc === "thong-tin" ? (
                <p>
                  Tài khoản đăng nhập: <strong>{taiKhoan}</strong>. Các chức
                  năng cập nhật hồ sơ sẽ được triển khai sau.
                </p>
              ) : (
                <p>
                  Giao diện chức năng đã được bố trí trong menu. Các thao tác
                  quản lý dữ liệu của mục này chưa được triển khai; sẽ kết nối
                  API bảo vệ quyền quản trị ở bước tiếp theo.
                </p>
              )}
              <button onClick={() => setMuc("tong-quan")}>
                ← Trở về tổng quan
              </button>
            </section>
          )}
        </main>
        {permissions.includes("tin-nhan") && (
          <TroChuyen token={token} inline={muc === "tin-nhan"} admin />
        )}
      </div>
    </div>
  );
}
