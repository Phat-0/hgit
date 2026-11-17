import type { CSSProperties } from "react";
import BieuTuong, {
  type TenBieuTuong,
} from "../../dung-chung/giao-dien/BieuTuong";
import type { Khoi } from "../../dung-chung/du-lieu/trang-chu-noi-dung";
import type { ChiNhanhBanDo } from "./GioiThieuLuuTru";
import BanDoChanTrang from "./BanDoChanTrang";
export default function ChanTrangKhach({
  data,
  name,
  branches,
  branch,
  map,
  rooms,
  combos,
}: {
  data: Khoi;
  name: string;
  branches: ChiNhanhBanDo[];
  branch: string;
  map: boolean;
  rooms: boolean;
  combos: boolean;
}) {
  const chat = () => window.dispatchEvent(new Event("homestay:mo-chat"));
  const links: [string, string, TenBieuTuong][] = [
    ...(rooms
      ? [
          ["/phong-gia", "Phòng và giá", "bed"] as [
            string,
            string,
            TenBieuTuong,
          ],
        ]
      : []),
    ...(rooms && combos
      ? [
          ["/uu-dai-combo", "Ưu đãi Combo", "gift"] as [
            string,
            string,
            TenBieuTuong,
          ],
        ]
      : []),
  ];
  const socials = [
    ["Facebook", data.facebook, "facebook"],
    ["TikTok", data.tiktok, "tiktok"],
    ["Instagram", data.instagram, "instagram"],
    ["Zalo", data.zalo, "zalo"],
  ];
  return (
    <footer
      className={
        "kh-footer kh-footer-designed " + (!map ? "kh-footer-no-map" : "")
      }
      style={
        {
          "--kh-footer-image": data.anh_nen
            ? `url(${JSON.stringify(data.anh_nen)})`
            : "none",
        } as CSSProperties
      }
    >
      {map && (
        <div className="kh-footer-location">
          <BanDoChanTrang chiNhanh={branches} branch={branch} />
          {data.dia_chi && <p>{data.dia_chi}</p>}
        </div>
      )}
      <div className="kh-footer-story">
        <div className="kh-footer-brand">
          {data.anh ? (
            <img src={data.anh} alt="" />
          ) : (
            <BieuTuong ten="home" size={38} />
          )}
          <h2>{data.tieu_de || name}</h2>
        </div>
        <p>{data.noi_dung}</p>
        <div className="kh-footer-benefits">
          {(
            [
              [data.loi_ich_1 || "Đặt phòng nhanh gọn", "home"],
              [data.loi_ich_2 || "Combo cho kỳ nghỉ", "gift"],
              [data.loi_ich_3 || "Lịch nghỉ linh hoạt", "calendar"],
            ] as [string, TenBieuTuong][]
          ).map(([text, icon]) => (
            <span key={icon}>
              <BieuTuong ten={icon} />
              {text}
            </span>
          ))}
        </div>
      </div>
      <nav className="kh-footer-explore" aria-label="Liên kết cuối trang">
        <h3>{data.tieu_de_lien_ket || "Khám phá " + name}</h3>
        {links.map(([href, label, icon]) => (
          <a key={href} href={href}>
            <BieuTuong ten={icon} />
            <span>{label}</span>
            <BieuTuong ten="chevron" size={14} />
          </a>
        ))}
        <button type="button" onClick={chat}>
          <BieuTuong ten="message" />
          <span>Liên hệ {name}</span>
          <BieuTuong ten="chevron" size={14} />
        </button>
      </nav>
      <div className="kh-footer-connect">
        <h3>{data.tieu_de_ket_noi || "Kết nối với chúng tôi"}</h3>
        <p>
          {data.noi_dung_ket_noi ||
            "Hỏi về phòng, lịch nghỉ và combo phù hợp với bạn."}
        </p>
        <button type="button" onClick={chat}>
          <BieuTuong ten="message" />
          {data.nhan_nut || "Nhắn tin cho " + name}
          <BieuTuong ten="chevron" size={14} />
        </button>
      </div>
      <div className="kh-footer-bottom">
        <small>
          © {new Date().getFullYear()} {data.ban_quyen || name}
        </small>
        <div className="kh-footer-contacts">
          {data.dien_thoai && (
            <a href={"tel:" + data.dien_thoai.replace(/[^+\d]/g, "")}>
              <BieuTuong ten="phone" />
              Hotline: {data.dien_thoai}
            </a>
          )}
          {data.zalo && (
            <a href={data.zalo} target="_blank" rel="noopener noreferrer">
              <BieuTuong ten="zalo" />
              Zalo
            </a>
          )}
          {data.website && (
            <a href={data.website} target="_blank" rel="noopener noreferrer">
              <BieuTuong ten="globe" />
              {new URL(data.website).hostname}
            </a>
          )}
          {data.email && (
            <a href={"mailto:" + data.email}>
              <BieuTuong ten="mail" />
              {data.email}
            </a>
          )}
        </div>
        <div className="kh-footer-socials">
          {socials.map(([label, url, icon]) =>
            url ? (
              <a
                key={label}
                href={url}
                aria-label={label}
                title={label}
                target="_blank"
                rel="noopener noreferrer"
              >
                <BieuTuong ten={icon as TenBieuTuong} />
              </a>
            ) : (
              <span
                key={label}
                className="kh-social-unlinked"
                role="img"
                aria-label={label}
                title={label}
              >
                <BieuTuong ten={icon as TenBieuTuong} />
              </span>
            ),
          )}
        </div>
        <div className="kh-footer-policies">
          {[
            ["Chính sách & điều khoản", data.chinh_sach],
            ["Bảo mật", data.bao_mat],
            ["FAQ", data.faq],
          ]
            .filter(([, url]) => url)
            .map(([label, url]) => (
              <a
                key={label}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {label}
              </a>
            ))}
        </div>
      </div>
    </footer>
  );
}
