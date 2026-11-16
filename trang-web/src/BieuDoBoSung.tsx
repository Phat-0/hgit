import { useEffect, useState } from "react";
import BieuDoThongKe from "./BieuDoThongKe";
import { NhieuKhoangNgay } from "./NhieuKhoangNgay";
import { quanTriApi } from "./bao-cao-api";
import { CHI_SO, type DuLieuThongKe } from "./thong-ke-thu-chi";
import { diemBoSung, gopNgayThanhKhoang, phamViBiTrung, type KhungBieuDo } from "./bieu-do-bo-sung";
export default function BieuDoBoSung({
  spec,
  onChange,
  onRemove,
  token,
  data,
  dataStart,
  dataEnd,
}: {
  spec: KhungBieuDo;
  onChange: (v: KhungBieuDo) => void;
  onRemove?: () => void;
  token: string;
  data: DuLieuThongKe;
  dataStart: string;
  dataEnd: string;
}) {
  const [source, setSource] = useState<DuLieuThongKe | null>(data),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  const start = spec.ranges.map((r) => r.tu).sort()[0] || "",
    end =
      spec.ranges
        .map((r) => r.den)
        .sort()
        .at(-1) || "";
  useEffect(() => {
    let live = true;
    setError("");
    if (
      !start ||
      !end ||
      Date.parse(end) - Date.parse(start) > 366 * 86400000
    ) {
      setSource(null);
      setLoading(false);
      setError("Chọn lịch tối đa 367 ngày.");
      return;
    }
    if (start >= dataStart && end <= dataEnd) {
      setSource(data);
      setLoading(false);
      return;
    }
    setSource(null);
    setLoading(true);
    void quanTriApi<DuLieuThongKe>(
      token,
      "thu-chi/thong-ke?" +
        new URLSearchParams({ tu_ngay: start, den_ngay: end }),
    )
      .then((d) => {
        if (live) setSource(d);
      })
      .catch((e) => {
        if (live) setError(e.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token, data, dataStart, dataEnd, start, end]);
  const active =
    spec.columns.find((c) => c.id === spec.metricId) || spec.columns[0];
  const points = source ? diemBoSung(spec, source) : [];
  const invalidPie =
    spec.type === "pie" &&
    (!active ||
      active.cachTinh !== "tong" ||
      ["so_du", "thoi_gian"].includes(active.chiSo) ||
      phamViBiTrung(spec.scopes));
  const units = [...new Set(points.map((p) => p.unit))];
  return (
    <section
      className={"tk-extra-chart tk-extra-" + spec.type}
      data-chart-card={spec.id}
    >
      <header>
        <h3>{spec.type === "pie" ? "Biểu đồ tròn" : "Biểu đồ cột"}</h3>
        {onRemove && (
          <button
            className="tk-extra-remove"
            type="button"
            aria-label="Xóa biểu đồ"
            onClick={onRemove}
          >
            ×
          </button>
        )}
      </header>
      <div className="tk-extra-tools">
        {spec.type === "pie" && (
          <select
            aria-label="Chỉ số biểu đồ tròn"
            value={active?.id || ""}
            onChange={(e) =>
              onChange({
                ...spec,
                metricId: e.target.value,
                ranges: spec.customCalendar
                  ? spec.ranges
                  : gopNgayThanhKhoang(
                      spec.bins
                        .filter((b) => b.columnId === e.target.value)
                        .flatMap((b) => b.ngay),
                    ),
              })
            }
          >
            {spec.columns.map((c) => (
              <option key={c.id} value={c.id}>
                {CHI_SO.find((m) => m[0] === c.chiSo)?.[1]} ·{" "}
                {c.cachTinh === "tong"
                  ? "Tổng"
                  : c.cachTinh === "tb_ngay"
                    ? "TB ngày"
                    : "TB tuần"}
              </option>
            ))}
          </select>
        )}
        <select
          aria-label="Chia thời gian biểu đồ"
          value={spec.group}
          onChange={(e) => onChange({ ...spec, group: e.target.value })}
        >
          {spec.type === "bar" && (
            <option value="cau_hinh">Theo thiết lập cột</option>
          )}
          <option value="ngay">Theo ngày</option>
          <option value="tuan">Theo tuần</option>
          <option value="thang">Theo tháng</option>
        </select>
        <NhieuKhoangNgay
          ranges={spec.ranges}
          onChange={(ranges) =>
            onChange({ ...spec, ranges, customCalendar: true })
          }
        />
      </div>
      {loading && <p role="status">Đang tải dữ liệu biểu đồ…</p>}
      {error && <p role="alert">{error}</p>}
      {source && !loading && !error && (
        <div className="tk-card-result">
          <BieuDoThongKe
            variant={spec.type}
            title={
              spec.type === "pie"
                ? CHI_SO.find((m) => m[0] === active?.chiSo)?.[1] || "Tỷ trọng"
                : "Dữ liệu đã chọn"
            }
            points={points}
            unit={units.length === 1 ? units[0] : "nhiều đơn vị"}
            comparisonOnly={invalidPie}
            pieReason="Chọn một chỉ số tổng cộng được, cùng đơn vị, các đối tượng không trùng nhau. Không cộng trực tiếp trung bình, thời gian trung bình hoặc số dư để tính tỷ trọng."
          />
        </div>
      )}
    </section>
  );
}
