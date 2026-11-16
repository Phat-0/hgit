import BieuDoBoSung from "./BieuDoBoSung";
import { gopNgayThanhKhoang, type KhungBieuDo } from "./bieu-do-bo-sung";
import { chuCacKhoang, chuKhoangNgay } from "./lich-hien-thi";
import { SapXepTrucTiep } from "./TuyChonBieuDo";
import { useLuaChonNoi, useBamNgoai } from "./lua-chon-noi";
import { useEffect, useMemo, useRef, useState } from "react";
import { NhieuKhoangNgay } from "./NhieuKhoangNgay";
import { RangePicker } from "./RangePicker";
import { ngayVN, quanTriApi } from "./bao-cao-api";
import { ngayCuoiThang } from "./so-thu-chi";
import { csvThuChi, taiTep, xlsxThuChi, type OXuat } from "./xuat-so-thu-chi";
import {
  CHI_SO,
  THU,
  hienSo,
  ngayNgan,
  nhomNgay,
  tenCot,
  tinhGiaTri,
  khungGioPhoBien,
  chuKhungGio,
  type CotThongKe,
  type DuLieuThongKe,
  type PhamVi,
} from "./thong-ke-thu-chi";
import BieuDoThongKe from "./BieuDoThongKe";
import "./thong-ke-thu-chi.css";
const CALCS = [
  { id: "tong", ten: "Tổng", mau: "#e5d9f2" },
  { id: "tb_ngay", ten: "Trung bình ngày", mau: "#d8eee5" },
  { id: "tb_tuan", ten: "Trung bình tuần", mau: "#f5e7d2" },
];
const allDays = [0, 1, 2, 3, 4, 5, 6];
const roomMetric = (key: string) => !["thu", "chi", "so_du"].includes(key);
type Row = PhamVi & { key: string; branch?: string };
function newColumn(metric: string, tu: string, den: string): CotThongKe {
  return {
    id: crypto.randomUUID(),
    chiSo: metric,
    cachTinh: "tong",
    chia: "chung",
    lichRieng: false,
    tu,
    den,
    thu: [...allDays],
    loaiDat: metric === "thoi_gian" ? ["Theo giờ"] : [],
    khungGio: false,
  };
}
function period(c: CotThongKe, tu: string, den: string) {
  return c.lichRieng
    ? c.khoang?.length
      ? chuCacKhoang(c.khoang)
      : c.tu && c.den
        ? chuKhoangNgay({ tu: c.tu, den: c.den })
        : "Chưa chọn lịch"
    : chuKhoangNgay({ tu, den });
}
export default function ThongKeThuChi({
  token,
  initial,
  onDirtyChange,
}: {
  token: string;
  initial?: { tu_ngay?: string; den_ngay?: string };
  onDirtyChange: (dirty: boolean) => void;
}) {
  useLuaChonNoi();
  const [tu, setTu] = useState(
      initial?.tu_ngay || ngayVN().slice(0, 7) + "-01",
    ),
    [den, setDen] = useState(
      initial?.den_ngay || ngayCuoiThang(ngayVN().slice(0, 7)),
    );
  const [commonRanges, setCommonRanges] = useState<
    { tu: string; den: string }[]
  >([]);
  const [cards, setCards] = useState<KhungBieuDo[]>([]);
  const [primaryPie, setPrimaryPie] = useState<{
    ranges: { tu: string; den: string }[];
    customCalendar: boolean;
    group: string;
    metricId: string;
  }>({ ranges: [], customCalendar: false, group: "ngay", metricId: "" });
  const [columns, setColumns] = useState<CotThongKe[]>(() =>
    ["thu", "chi", "so_du", "dat", "huy"].map((m) => newColumn(m, tu, den)),
  );
  const [data, setData] = useState<DuLieuThongKe | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [revision, setRevision] = useState(0);
  const [chosenScopes, setChosenScopes] = useState<string[]>(["tong"]),
    [rowOrder, setRowOrder] = useState<string[]>([]),
    [selectedRows, setSelectedRows] = useState<string[]>([]),
    [editing, setEditing] = useState<string | null>(null);
  const [chart, setChart] = useState(false),
    [chartKeys, setChartKeys] = useState<string[]>([]),
    [saved, setSaved] = useState(false);
  const dragging = useRef("");
  const columnDrag = useRef("");
  const [dragColumnID, setDragColumnID] = useState("");
  const dragGhost = useRef<HTMLCanvasElement | null>(null);
  function beginColumnDrag(e: React.DragEvent, id: string) {
    columnDrag.current = id;
    setDragColumnID(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("application/x-thong-ke-column", id);
    const ghost = document.createElement("canvas");
    ghost.width = ghost.height = 1;
    ghost.style.cssText =
      "position:fixed;left:-1000px;top:0;pointer-events:none";
    document.body.append(ghost);
    dragGhost.current?.remove();
    dragGhost.current = ghost;
    e.dataTransfer.setDragImage(ghost, 0, 0);
  }
  function endColumnDrag() {
    columnDrag.current = "";
    setDragColumnID("");
    dragGhost.current?.remove();
    dragGhost.current = null;
  }
  useEffect(() => {
    if (!dragColumnID) return;
    const over = (e: DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
    };
    const end = () => endColumnDrag();
    document.addEventListener("dragover", over, true);
    document.addEventListener("dragend", end);
    return () => {
      document.removeEventListener("dragover", over, true);
      document.removeEventListener("dragend", end);
      dragGhost.current?.remove();
    };
  }, [dragColumnID]);
  function moveColumn(id: string, target: string) {
    if (!id || id === target) return;
    setColumns((old) => {
      const next = [...old],
        a = next.findIndex((c) => c.id === id),
        b = next.findIndex((c) => c.id === target);
      if (a < 0 || b < 0) return old;
      const [item] = next.splice(a, 1);
      next.splice(b, 0, item);
      return next;
    });
    mark();
  }
  function columnKeys(e: React.KeyboardEvent, id: string) {
    if (!e.altKey || !["ArrowLeft", "ArrowRight"].includes(e.key)) return;
    e.preventDefault();
    const i = columns.findIndex((c) => c.id === id),
      target = columns[i + (e.key === "ArrowLeft" ? -1 : 1)];
    if (target) moveColumn(id, target.id);
  }
  const rowAnchor = useRef<string | null>(null);
  const selection = useRef<{
    start: number;
    base: string[];
    add: boolean;
  } | null>(null);
  const [sortRows, setSortRows] = useState("manual");
  const [chartHasPrivate, setChartHasPrivate] = useState(false);
  const [chartTu, setChartTu] = useState(tu),
    [chartDen, setChartDen] = useState(den);
  useEffect(() => {
    if (!chartHasPrivate) {
      setChartTu(tu);
      setChartDen(den);
    }
  }, [tu, den, chartHasPrivate]);
  useEffect(() => {
    const stop = () => {
      selection.current = null;
    };
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    return () => {
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
    };
  }, []);

  useBamNgoai(
    !!editing,
    ".tk-column-editor,.tk-column-list,.tk-add-column,.lp-range-portal",
    () => setEditing(null),
  );
  const mark = () => {
    setSaved(false);
    onDirtyChange(true);
  };
  const allRanges = [
    ...(commonRanges.length ? commonRanges : [{ tu, den }]),
    ...columns
      .filter((c) => c.lichRieng && (c.tu || c.den))
      .flatMap((c) =>
        c.khoang?.length ? c.khoang : [{ tu: c.tu, den: c.den }],
      ),
  ];
  const from = allRanges.map((r) => r.tu).sort()[0],
    to = allRanges
      .map((r) => r.den)
      .sort()
      .at(-1)!;
  const valid =
    allRanges.every(
      (r) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.tu) &&
        /^\d{4}-\d{2}-\d{2}$/.test(r.den) &&
        r.tu <= r.den,
    ) && Date.parse(to) - Date.parse(from) <= 366 * 86400000;
  useEffect(() => {
    let live = true;
    setData(null);
    setError("");
    if (!valid) {
      setLoading(false);
      setError(
        "Lịch phải hợp lệ; khoảng dữ liệu chung và riêng tối đa 367 ngày.",
      );
      return;
    }
    setLoading(true);
    void quanTriApi<DuLieuThongKe>(
      token,
      "thu-chi/thong-ke?" +
        new URLSearchParams({ tu_ngay: from, den_ngay: to }),
    )
      .then((d) => {
        if (live) {
          setData(d);
          setSaved(false);
          onDirtyChange(true);
        }
      })
      .catch((e) => {
        if (live) setError((e as Error).message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [token, from, to, valid, revision, onDirtyChange]);
  const scopes: Row[] = useMemo(
    () =>
      !data
        ? []
        : [
            {
              key: "tong",
              id: "tong",
              loai: "tong",
              ten: "Tổng các chi nhánh",
            },
            {
              key: "tong_phong",
              id: "tong_phong",
              loai: "tong_phong",
              ten: "Tổng phòng",
            },
            ...data.chi_nhanh.map((b) => ({
              key: "cn:" + b.id,
              id: b.id,
              loai: "chi_nhanh" as const,
              ten: b.ten_homestay,
            })),
            ...data.phong.map((p) => ({
              key: "p:" + p.id,
              id: p.id,
              loai: "phong" as const,
              branch: p.homestay_id,
              ten: p.ma_phong || p.ten_phong,
            })),
          ],
    [data],
  );
  const rows = useMemo(
    () =>
      scopes
        .filter((p) => chosenScopes.includes(p.key))
        .sort((a, b) => {
          if (sortRows === "az" || sortRows === "za")
            return (
              (sortRows === "za" ? -1 : 1) *
              a.ten.localeCompare(b.ten, "vi", { numeric: true })
            );
          if (sortRows === "asc" || sortRows === "desc") {
            const raw = columns.find((c) => !c.an);
            const col =
              raw && !raw.lichRieng && commonRanges.length
                ? { ...raw, lichRieng: true, khoang: commonRanges }
                : raw;
            const dates = col
              ? nhomNgay(col, tu, den).flatMap((b) => b.ngay)
              : [];
            const diff =
              data && col
                ? (tinhGiaTri(data, a, col, dates) || 0) -
                  (tinhGiaTri(data, b, col, dates) || 0)
                : 0;
            return (sortRows === "desc" ? -1 : 1) * diff;
          }
          const ia = rowOrder.indexOf(a.key),
            ib = rowOrder.indexOf(b.key);
          return (
            (ia < 0 ? 1e6 : ia) - (ib < 0 ? 1e6 : ib) ||
            a.ten.localeCompare(b.ten, "vi", { numeric: true })
          );
        }),
    [
      scopes,
      chosenScopes,
      rowOrder,
      sortRows,
      columns,
      data,
      tu,
      den,
      commonRanges,
    ],
  );
  const allExpanded = useMemo(
    () =>
      columns.map((raw) => {
        const c =
          !raw.lichRieng && commonRanges.length
            ? { ...raw, lichRieng: true, khoang: commonRanges, tu, den }
            : raw;
        const bins = nhomNgay(c, tu, den);
        return {
          config: c,
          bins: bins.length
            ? bins
            : [
                {
                  key: "empty",
                  ten:
                    c.lichRieng && !c.tu ? "Chọn lịch riêng" : "Chưa chọn thứ",
                  ngay: [] as string[],
                },
              ],
        };
      }),
    [columns, tu, den, commonRanges],
  );
  const expanded = useMemo(
    () => allExpanded.filter((g) => !g.config.an),
    [allExpanded],
  );
  const leaves = useMemo(
    () =>
      expanded.flatMap((g) =>
        g.bins.map((b) => ({ key: g.config.id + ":" + b.key, c: g.config, b })),
      ),
    [expanded],
  );
  const hasSubheaders = expanded.some(
    (g) => g.config.chia !== "chung" && g.bins.some((b) => b.ngay.length),
  );
  const headerRows = hasSubheaders ? 2 : 1;
  const tooLarge = leaves.length > 500 || leaves.length * rows.length > 50000;
  const chartRows = rows.filter((p) => selectedRows.includes(p.key));
  const comparisonOnly =
    chartRows.length > 1 &&
    (chartRows.some((p) => p.loai === "tong" || p.loai === "tong_phong") ||
      chartRows.some(
        (p) =>
          p.loai === "chi_nhanh" &&
          chartRows.some((r) => r.loai === "phong" && r.branch === p.id),
      ));
  const chartOptions = allExpanded.flatMap((g) =>
    g.bins
      .filter((b) => b.ngay.length)
      .map((b) => ({
        key: g.config.id + ":" + b.key,
        c: g.config,
        b: { ...b, ngay: b.ngay.filter((d) => d >= chartTu && d <= chartDen) },
      })),
  );
  function fromTable(key?: string) {
    setChart(true);
    setChartKeys(key ? [key] : leaves.map((l) => l.key));
  }
  const chartLeaves = chartOptions.filter(
    (l) =>
      chartKeys.includes(l.key) &&
      l.b.ngay.some((d) => d >= chartTu && d <= chartDen),
  );
  function specFromSelection(
    type: "bar" | "pie",
    id: string = crypto.randomUUID(),
  ): KhungBieuDo {
    return {
      id,
      type,
      columns: [...new Map(chartLeaves.map((l) => [l.c.id, l.c])).values()],
      scopes: chartRows.map((p) => ({ ...p })),
      bins: chartLeaves.map((l) => ({
        columnId: l.c.id,
        key: l.b.key,
        ten: l.b.ten,
        ngay: [...l.b.ngay],
      })),
      ranges: gopNgayThanhKhoang(
        chartLeaves
          .filter((l) => type !== "pie" || l.c.id === chartLeaves[0]?.c.id)
          .flatMap((l) => l.b.ngay),
      ),
      group: type === "pie" ? "ngay" : "cau_hinh",
      metricId: chartLeaves[0]?.c.id || "",
      customCalendar: false,
    };
  }
  const livePie = specFromSelection("pie", "primary-pie");
  const primaryMetric = livePie.columns.some(
    (c) => c.id === primaryPie.metricId,
  )
    ? primaryPie.metricId
    : livePie.metricId;
  const primaryPieSpec = {
    ...livePie,
    ...primaryPie,
    metricId: primaryMetric,
    ranges: primaryPie.customCalendar
      ? primaryPie.ranges
      : gopNgayThanhKhoang(
          livePie.bins
            .filter((b) => b.columnId === primaryMetric)
            .flatMap((b) => b.ngay),
        ),
  };
  function toggleScope(key: string) {
    setChosenScopes((old) =>
      old.includes(key) ? old.filter((k) => k !== key) : [...old, key],
    );
    setSelectedRows((old) => old.filter((k) => k !== key));
    mark();
  }
  function toggleRow(key: string, fromSheet = false) {
    if (fromSheet || !chartKeys.length) fromTable();
    else setChart(true);
    rowAnchor.current = key;
    setSelectedRows((old) =>
      old.includes(key) ? old.filter((k) => k !== key) : [...old, key],
    );
    mark();
  }
  function patch(id: string, x: Partial<CotThongKe>) {
    setColumns((old) => old.map((c) => (c.id === id ? { ...c, ...x } : c)));
    mark();
  }
  function moveRow(id: string, target: string) {
    const ids = rows.map((p) => p.key),
      a = ids.indexOf(id),
      b = ids.indexOf(target);
    if (a < 0 || b < 0 || a === b) return;
    ids.splice(a, 1);
    ids.splice(b, 0, id);
    setSortRows("manual");
    setRowOrder(ids);
    mark();
  }
  function addColumn(metric: string, cachTinh = "tong") {
    const c = { ...newColumn(metric, tu, den), cachTinh };
    setColumns((old) => [...old, c]);
    setEditing(c.id);
    mark();
  }
  function cellText(p: Row, c: CotThongKe, days: string[]) {
    const n = tinhGiaTri(data!, p, c, days),
      k = khungGioPhoBien(data!, p, c, days);
    return { n, k };
  }
  function exportFile(format: string) {
    if (!data || loading || error || tooLarge) return;
    const top: OXuat[] = ["Đối tượng"],
      bottom: OXuat[] = ["Phạm vi"];
    for (const l of leaves) {
      top.push(
        tenCot(l.c) +
          " · " +
          period(l.c, tu, den) +
          (l.c.loaiDat.length ? " · " + l.c.loaiDat.join(", ") : ""),
      );
      bottom.push(
        l.b.ten + " · " + (CHI_SO.find((m) => m[0] === l.c.chiSo)?.[2] || ""),
      );
      if (l.c.khungGio) {
        top.push("Khung giờ phổ biến · " + period(l.c, tu, den));
        bottom.push(l.b.ten + " · loại đặt giờ");
      }
    }
    const table: OXuat[][] = [
      top,
      bottom,
      ...rows.map((p) => [
        p.ten,
        ...leaves.flatMap((l) => {
          const { n, k } = cellText(p, l.c, l.b.ngay);
          return l.c.khungGio
            ? [n === null ? "" : n, chuKhungGio(k)]
            : [n === null ? "" : n];
        }),
      ]),
    ];
    const name = "thong-ke-" + tu + "-" + den;
    if (format === "csv")
      taiTep(name + ".csv", csvThuChi(table), "text/csv;charset=utf-8");
    else if (format === "xlsx")
      taiTep(
        name + ".xlsx",
        xlsxThuChi([
          { name: "Thong ke", rows: table },
          {
            name: "Quy tac",
            rows: [
              ["Chỉ tiêu", "Cách tính"],
              [
                "Thu/chi",
                "Từ sổ đã lưu; trung bình ngày/tuần gồm ngày/tuần không phát sinh.",
              ],
              [
                "Đơn",
                "Ngày tạo đơn theo giờ Việt Nam; đặt/giá/thời gian chỉ tính đơn đã xác nhận/nhận/trả. Hủy tính trạng thái đã hủy.",
              ],
              [
                "TB thời gian lưu trú",
                "Tổng giờ lưu trú / lượt đặt hợp lệ của loại đã chọn. Trung bình ngày/tuần lấy trung bình các mức trung bình của ngày/tuần có đơn.",
              ],
              [
                "Khung giờ phổ biến",
                "Chỉ loại Theo giờ. Nhóm theo giờ bắt đầu, chọn nhóm nhiều lượt nhất (hòa chọn giờ sớm hơn). Bắt đầu/kết thúc là trung bình trong nhóm đó; không phải giờ cao điểm công suất sử dụng.",
              ],
              [
                "Số dư",
                "Tổng hệ thống dùng tiền tồn từng tháng; chi nhánh/phòng chỉ lũy kế khoản gán, không phân bổ tiền tồn chung.",
              ],
              [
                "Phạm vi",
                "Các hàng có thể chồng nhau (tổng/chi nhánh/phòng); không cộng các hàng thành tổng mới.",
              ],
              ["Trống", "Chưa chọn lịch hoặc không có mẫu số."],
            ],
          },
        ]),
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
    else if (format === "json")
      taiTep(
        name + ".json",
        JSON.stringify(
          {
            phien_ban: 2,
            tu,
            den,
            doi_tuong: chosenScopes,
            cot: columns,
            thu_tu: rows.map((p) => p.key),
            hang_da_chon: selectedRows,
            cot_bieu_do: chartKeys,
            lich_chung: commonRanges,
            bieu_do_them: cards,
            bieu_do_tron: primaryPie,
            bang: table,
            xuat_luc: new Date().toISOString(),
          },
          null,
          2,
        ),
        "application/json",
      );
    else return;
    setSaved(true);
    onDirtyChange(false);
  }
  const current = columns.find((c) => c.id === editing);
  const kinds = [
    ...new Set([
      "Theo giờ",
      "Theo ngày",
      "Theo đêm",
      ...(data?.don.map((d) => d.hinh_thuc_dat) || []),
    ]),
  ];
  const scopeInput = (p: Row) => (
    <label key={p.key}>
      <input
        type="checkbox"
        aria-label={"Hiển thị " + p.ten}
        checked={chosenScopes.includes(p.key)}
        onChange={() => toggleScope(p.key)}
      />
      <span title={p.ten}>{p.ten}</span>
    </label>
  );
  return (
    <section className="stc-page tk-page">
      <section className="stc-block">
        <header className="tk-heading">
          <h2>Thống kê</h2>
          <span className={saved ? "tk-saved" : "tk-unsaved"}>
            {saved ? "Đã xuất bản hiện tại" : "Chưa lưu ra file"}
          </span>
        </header>
        <div className="tk-toolbar">
          <RangePicker
            compact
            quickMonth
            start={tu}
            end={den}
            ranges={commonRanges.length ? commonRanges : [{ tu, den }]}
            placeholder={
              commonRanges.length ? chuCacKhoang(commonRanges) : undefined
            }
            onRangesChange={(ranges) => {
              if (!ranges.length) return;
              setCommonRanges(ranges);
              setTu(ranges.map((r) => r.tu).sort()[0]);
              setDen(
                ranges
                  .map((r) => r.den)
                  .sort()
                  .at(-1)!,
              );
              mark();
            }}
            onChange={(a, b) => {
              setTu(a);
              setDen(b);
              setCommonRanges([]);
              mark();
            }}
          />
          <details className="stc-check-picker tk-scope-picker">
            <summary aria-label="Đối tượng thống kê">
              Đối tượng ({chosenScopes.length})
            </summary>
            <div
              className="tk-object-layout"
              role="group"
              aria-label="Chọn nhiều đối tượng thống kê"
            >
              <details>
                <summary>Chi nhánh</summary>
                <div>
                  {scopes.filter((p) => p.loai === "tong").map(scopeInput)}
                  {scopes.filter((p) => p.loai === "chi_nhanh").map(scopeInput)}
                </div>
              </details>
              <details>
                <summary>Phòng</summary>
                <div>
                  {scopes
                    .filter((p) => p.loai === "tong_phong")
                    .map(scopeInput)}
                  {data?.chi_nhanh.map((b) => (
                    <section className="tk-room-branch tk-room-all" key={b.id}>
                      <h5 title={b.ten_homestay}>{b.ten_homestay}</h5>
                      <div>
                        {scopes
                          .filter(
                            (p) => p.loai === "phong" && p.branch === b.id,
                          )
                          .map(scopeInput)}
                        {!scopes.some(
                          (p) => p.loai === "phong" && p.branch === b.id,
                        ) && <small>Chưa có phòng.</small>}
                      </div>
                    </section>
                  ))}
                </div>
              </details>
            </div>
          </details>
          <details className="stc-check-picker tk-add-column tk-value-picker">
            <summary aria-label="Chọn giá trị thống kê">Giá trị</summary>
            <div>
              {CALCS.map((group) => (
                <section className="tk-value-options" key={group.id}>
                  <h4>{group.ten}</h4>
                  <div>
                    {CHI_SO.map((m) => (
                      <button
                        type="button"
                        key={m[0]}
                        disabled={columns.length >= 20}
                        onClick={(e) => {
                          addColumn(m[0], group.id);
                          e.currentTarget
                            .closest(".tk-add-column")
                            ?.removeAttribute("open");
                        }}
                      >
                        {m[1]}
                      </button>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </details>
          <button
            type="button"
            onClick={() => {
              setRevision((n) => n + 1);
              mark();
            }}
            disabled={loading}
          >
            ↻ Cập nhật
          </button>
          <details className="stc-check-picker stc-chart-menu">
            <summary aria-label="Lưu hoặc xuất thống kê">☰</summary>
            <div>
              <SapXepTrucTiep
                label="Sắp xếp hàng thống kê"
                value={sortRows}
                onChange={(v) => {
                  setSortRows(v);
                  mark();
                }}
                options={[
                  ["manual", "Thứ tự kéo thả"],
                  ["az", "A–Z"],
                  ["za", "Z–A"],
                  ["asc", "Giá trị nhỏ → lớn"],
                  ["desc", "Giá trị lớn → nhỏ"],
                ]}
              />
              <small>Sắp xếp giá trị theo cột đầu tiên.</small>
              <select
                aria-label="Xuất bảng thống kê"
                value=""
                disabled={
                  !data ||
                  loading ||
                  !!error ||
                  tooLarge ||
                  !rows.length ||
                  !leaves.length
                }
                onChange={(e) => exportFile(e.target.value)}
              >
                <option value="" disabled>
                  Xuất file…
                </option>
                <option value="xlsx">Excel (.xlsx)</option>
                <option value="csv">CSV (.csv)</option>
                <option value="json">Lưu bản thống kê (.json)</option>
              </select>
            </div>
          </details>
        </div>
        {error && <p role="alert">{error}</p>}
        {loading && <p role="status">Đang tổng hợp dữ liệu…</p>}
        <div className="tk-column-list" aria-label="Các cột thống kê">
          {CALCS.map((group) => (
            <section className="tk-calc-group" key={group.id}>
              <h4>{group.ten}</h4>
              <div>
                {columns
                  .filter((c) => c.cachTinh === group.id)
                  .map((c) => (
                    <div
                      className="tk-value-chip"
                      key={c.id}
                      data-visible={!c.an}
                      draggable
                      onDragStart={(e) => beginColumnDrag(e, c.id)}
                      data-dragging={dragColumnID === c.id}
                      onDragOver={(e) => {
                        if (columnDrag.current) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        moveColumn(columnDrag.current, c.id);
                        endColumnDrag();
                      }}
                      onDragEnd={endColumnDrag}
                      style={{ background: group.mau }}
                    >
                      <button
                        type="button"
                        title={
                          tenCot(c) +
                          " · Bấm để ẩn/hiện; nhấp đúp để sửa; kéo để đổi thứ tự"
                        }
                        aria-pressed={!c.an}
                        onClick={() => patch(c.id, { an: !c.an })}
                        onDoubleClick={() => setEditing(c.id)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setEditing(c.id);
                        }}
                        onKeyDown={(e) => {
                          if (e.altKey && e.key === "Enter") {
                            e.preventDefault();
                            setEditing(c.id);
                          } else columnKeys(e, c.id);
                        }}
                      >
                        {CHI_SO.find((m) => m[0] === c.chiSo)?.[1]}
                        {c.loaiDat.length ? " · " + c.loaiDat.join(", ") : ""}
                      </button>
                      <button
                        type="button"
                        className="tk-value-remove"
                        aria-label={"Bỏ cột " + tenCot(c)}
                        onClick={() => {
                          setColumns((old) => old.filter((x) => x.id !== c.id));
                          if (editing === c.id) setEditing(null);
                          mark();
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
              </div>
            </section>
          ))}
        </div>
        {current && (
          <div
            className="tk-column-editor tk-editor-compact"
            role="group"
            aria-label="Thiết lập cột thống kê"
          >
            <select
              aria-label="Chỉ số cột"
              title="Chỉ số"
              value={current.chiSo}
              onChange={(e) =>
                patch(current.id, {
                  chiSo: e.target.value,
                  loaiDat: e.target.value === "thoi_gian" ? ["Theo giờ"] : [],
                  khungGio: false,
                })
              }
            >
              {CHI_SO.map((m) => (
                <option key={m[0]} value={m[0]}>
                  {m[1]}
                </option>
              ))}
            </select>
            {roomMetric(current.chiSo) && (
              <select
                aria-label="Loại đặt của cột"
                title="Loại đặt"
                value={current.loaiDat[0] || ""}
                onChange={(e) =>
                  patch(current.id, {
                    loaiDat: e.target.value ? [e.target.value] : [],
                    khungGio: false,
                  })
                }
              >
                {current.chiSo !== "thoi_gian" && (
                  <option value="">Tất cả loại đặt</option>
                )}
                {kinds.map((k) => (
                  <option key={k} value={k}>
                    {k}
                  </option>
                ))}
              </select>
            )}
            <select
              aria-label="Cách tính cột"
              title="Cách tính"
              value={current.cachTinh}
              onChange={(e) => patch(current.id, { cachTinh: e.target.value })}
            >
              <option value="tong">Tổng</option>
              <option value="tb_ngay">Trung bình ngày</option>
              <option value="tb_tuan">Trung bình tuần</option>
            </select>
            <select
              aria-label="Chia cột thống kê"
              title="Chia cột"
              value={current.chia}
              onChange={(e) => {
                const chia = e.target.value;
                patch(current.id, {
                  chia,
                  thu: [...allDays],
                });
              }}
            >
              <option value="chung">Chung</option>
              <option value="ngay">Theo ngày</option>
              <option value="tuan">Theo tuần</option>
              <option value="thang">Theo tháng</option>
            </select>
            <NhieuKhoangNgay
              ranges={
                current.lichRieng
                  ? current.khoang?.length
                    ? current.khoang
                    : current.tu
                      ? [{ tu: current.tu, den: current.den }]
                      : []
                  : []
              }
              onChange={(ranges) =>
                patch(current.id, {
                  lichRieng: ranges.length > 0,
                  khoang: ranges,
                  tu: ranges[0]?.tu || tu,
                  den: ranges.at(-1)?.den || den,
                })
              }
            />
            {current.chia === "ngay" && (
              <div className="tk-weekdays">
                {THU.map((t, i) => (
                  <label key={t}>
                    <input
                      type="checkbox"
                      checked={current.thu.includes(i)}
                      onChange={(e) =>
                        patch(current.id, {
                          thu: e.target.checked
                            ? [...current.thu, i]
                            : current.thu.filter((x) => x !== i),
                        })
                      }
                    />
                    {t}
                  </label>
                ))}
              </div>
            )}
            {roomMetric(current.chiSo) && current.loaiDat[0] === "Theo giờ" && (
              <label className="tk-check">
                <input
                  type="checkbox"
                  aria-label="Hiện khung giờ phổ biến"
                  checked={!!current.khungGio}
                  onChange={(e) =>
                    patch(current.id, { khungGio: e.target.checked })
                  }
                />
                Lượt theo khung giờ
              </label>
            )}
            <button type="button" onClick={() => setEditing(null)}>
              Xong
            </button>
          </div>
        )}
        {tooLarge && (
          <p role="alert">
            Tối đa 500 cột con và 50.000 ô; hãy thu hẹp lịch hoặc bớt cột/hàng.
          </p>
        )}
        {data && !error && !tooLarge && (
          <div className="tk-sheet-scroll">
            <table className="tk-sheet">
              <thead>
                <tr>
                  <th className="tk-row-check" rowSpan={headerRows}>
                    <input
                      type="checkbox"
                      aria-label="Chọn tất cả hàng thống kê"
                      checked={
                        !!rows.length &&
                        rows.every((p) => selectedRows.includes(p.key))
                      }
                      onChange={(e) => {
                        if (e.target.checked) fromTable();
                        setSelectedRows(
                          e.target.checked ? rows.map((p) => p.key) : [],
                        );
                        mark();
                      }}
                    />
                  </th>
                  <th rowSpan={headerRows} className="tk-name">
                    Đối tượng
                  </th>
                  {expanded.map((g) => (
                    <th
                      key={g.config.id}
                      data-column-id={g.config.id}
                      draggable
                      onDragStart={(e) => beginColumnDrag(e, g.config.id)}
                      data-dragging={dragColumnID === g.config.id}
                      onDragOver={(e) => {
                        if (columnDrag.current) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        moveColumn(columnDrag.current, g.config.id);
                        endColumnDrag();
                      }}
                      onDragEnd={endColumnDrag}
                      colSpan={g.bins.length}
                      rowSpan={
                        hasSubheaders &&
                        (g.config.chia === "chung" ||
                          !g.bins.some((b) => b.ngay.length))
                          ? 2
                          : 1
                      }
                    >
                      <button
                        type="button"
                        title="Sửa tính chất; kéo để đổi vị trí cột"
                        onKeyDown={(e) => columnKeys(e, g.config.id)}
                        onClick={() => setEditing(g.config.id)}
                      >
                        {tenCot(g.config)}
                        <small>
                          {period(g.config, tu, den)} ·{" "}
                          {CHI_SO.find((m) => m[0] === g.config.chiSo)?.[2]}
                          {g.config.loaiDat.length
                            ? " · " + g.config.loaiDat.join(", ")
                            : ""}
                          {g.config.khungGio ? " · Khung giờ phổ biến" : ""}
                        </small>
                      </button>
                    </th>
                  ))}
                </tr>
                {hasSubheaders && (
                  <tr>
                    {expanded
                      .filter(
                        (g) =>
                          g.config.chia !== "chung" &&
                          g.bins.some((b) => b.ngay.length),
                      )
                      .flatMap((g) =>
                        g.bins.map((b) => (
                          <th key={g.config.id + ":" + b.key}>
                            {b.ngay.length ? b.ten : ""}
                          </th>
                        )),
                      )}
                  </tr>
                )}
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr
                    key={p.key}
                    data-row-key={p.key}
                    aria-selected={selectedRows.includes(p.key)}
                    onPointerDown={(e) => {
                      if (
                        e.button !== 0 ||
                        e.altKey ||
                        (e.target as HTMLElement).closest("input,button")
                      )
                        return;
                      e.preventDefault();
                      fromTable(
                        (e.target as HTMLElement).closest<HTMLElement>(
                          "[data-value-key]",
                        )?.dataset.valueKey,
                      );
                      const index = rows.findIndex((r) => r.key === p.key);
                      if (e.shiftKey && rowAnchor.current) {
                        const ai = rows.findIndex(
                          (r) => r.key === rowAnchor.current,
                        );
                        const range = rows
                          .slice(
                            Math.min(ai < 0 ? index : ai, index),
                            Math.max(ai < 0 ? index : ai, index) + 1,
                          )
                          .map((r) => r.key);
                        setSelectedRows(
                          e.ctrlKey || e.metaKey
                            ? [...new Set([...selectedRows, ...range])]
                            : range,
                        );
                        selection.current = null;
                      } else {
                        rowAnchor.current = p.key;
                        const add = !selectedRows.includes(p.key);
                        selection.current = {
                          start: index,
                          base: selectedRows.filter((k) => k !== p.key),
                          add,
                        };
                        setSelectedRows((old) =>
                          add
                            ? [...old, p.key]
                            : old.filter((k) => k !== p.key),
                        );
                      }
                      mark();
                    }}

                    onPointerEnter={() => {
                      const s = selection.current;
                      if (!s) return;
                      const i = rows.findIndex((r) => r.key === p.key);
                      const interval = rows
                        .slice(Math.min(s.start, i), Math.max(s.start, i) + 1)
                        .map((r) => r.key);
                      setSelectedRows(
                        s.add
                          ? [
                              ...new Set([
                                ...s.base,
                                ...rows
                                  .slice(
                                    Math.min(s.start, i),
                                    Math.max(s.start, i) + 1,
                                  )
                                  .map((r) => r.key),
                              ]),
                            ]
                          : s.base.filter((k) => !interval.includes(k)),
                      );
                    }}

                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      moveRow(dragging.current, p.key);
                      dragging.current = "";
                    }}
                  >
                    <td className="tk-row-check">
                      <input
                        type="checkbox"
                        aria-label={"Chọn hàng " + p.ten}
                        checked={selectedRows.includes(p.key)}
                        onChange={() => {}}
                        onClick={(e) => {
                          if (e.shiftKey && rowAnchor.current) {
                            const ai = rows.findIndex(
                                (r) => r.key === rowAnchor.current,
                              ),
                              bi = rows.findIndex((r) => r.key === p.key);
                            setSelectedRows(
                              rows
                                .slice(
                                  Math.min(ai < 0 ? bi : ai, bi),
                                  Math.max(ai < 0 ? bi : ai, bi) + 1,
                                )
                                .map((r) => r.key),
                            );
                            mark();
                          } else toggleRow(p.key, true);
                        }}
                      />
                    </td>
                    <th
                      scope="row"
                      className="tk-name"
                      title="Alt + kéo để đổi thứ tự hàng"
                      draggable
                      onDragStart={(e) => {
                        dragging.current = p.key;
                        e.dataTransfer.setData("text/plain", p.key);
                      }}
                      onDragEnd={() => {
                        dragging.current = "";
                      }}
                    >
                      <div>
                        <span>
                          {p.ten}
                          <small>
                            {p.loai === "tong"
                              ? "Toàn hệ thống"
                              : p.loai === "chi_nhanh"
                                ? "Chi nhánh"
                                : "Phòng"}
                          </small>
                        </span>
                      </div>
                    </th>
                    {leaves.map((l) => {
                      const { n, k } = cellText(p, l.c, l.b.ngay);
                      return (
                        <td tabIndex={0} key={l.key} data-value-key={l.key}>
                          {hienSo(n)}
                          {l.c.khungGio && (
                            <small
                              className="tk-peak-time"
                              title="Nhóm giờ bắt đầu có nhiều lượt đặt nhất; giờ đầu/cuối là trung bình của nhóm"
                            >
                              {chuKhungGio(k)}
                            </small>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!rows.length && (
                  <tr>
                    <td colSpan={2 + leaves.length}>
                      Chọn đối tượng để hiển thị bảng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
        {!columns.length && <p>Chọn Giá trị để thêm cột.</p>}
        <div
          className="tk-chart-controls"
          aria-label="Thiết lập biểu đồ thống kê"
        >
          <section className="tk-inline-objects" aria-label="Đối tượng biểu đồ">
            {[
              {
                ten: "Tổng",
                items: rows.filter(
                  (p) => p.loai === "tong" || p.loai === "tong_phong",
                ),
              },
              {
                ten: "Chi nhánh",
                items: rows.filter((p) => p.loai === "chi_nhanh"),
              },
            ].map((group) => (
              <div className="tk-inline-row" key={group.ten}>
                <strong>{group.ten}</strong>
                <div>
                  {group.items.map((p) => (
                    <button
                      type="button"
                      key={p.key}
                      aria-pressed={selectedRows.includes(p.key)}
                      onClick={() => toggleRow(p.key)}
                    >
                      {p.ten}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="tk-inline-row">
              <strong>Phòng</strong>
              <div>
                {data?.chi_nhanh
                  .filter((b) =>
                    rows.some((p) => p.loai === "phong" && p.branch === b.id),
                  )
                  .map((b) => (
                    <div className="tk-inline-branch" key={b.id}>
                      <small>{b.ten_homestay}</small>
                      {rows
                        .filter((p) => p.loai === "phong" && p.branch === b.id)
                        .map((p) => (
                          <button
                            type="button"
                            key={p.key}
                            aria-pressed={selectedRows.includes(p.key)}
                            onClick={() => toggleRow(p.key)}
                          >
                            {p.ten}
                          </button>
                        ))}
                    </div>
                  ))}
              </div>
            </div>
          </section>
          <section className="tk-inline-values" aria-label="Giá trị biểu đồ">
            {CALCS.map((group) => (
              <div className="tk-inline-row" key={group.id}>
                <strong>{group.ten}</strong>
                <div>
                  {columns
                    .filter((c) => c.cachTinh === group.id)
                    .map((c) => {
                      const opts = chartOptions.filter(
                        (l) => l.c.id === c.id && l.b.ngay.length,
                      );
                      return (
                        <div className="tk-inline-metric" key={c.id}>
                          <button
                            type="button"
                            style={{ background: group.mau }}
                            aria-pressed={
                              opts.length > 0 &&
                              opts.every((l) => chartKeys.includes(l.key))
                            }
                            onClick={() => {
                              const keys = opts.map((l) => l.key);
                              setChartKeys((old) =>
                                keys.every((k) => old.includes(k))
                                  ? old.filter((k) => !keys.includes(k))
                                  : [...new Set([...old, ...keys])],
                              );
                              setChart(true);
                              mark();
                            }}
                          >
                            {CHI_SO.find((m) => m[0] === c.chiSo)?.[1]}
                          </button>
                          {c.chia !== "chung" &&
                            [
                              ...new Set(
                                opts.map((l) => l.b.ngay[0].slice(0, 7)),
                              ),
                            ].map((month) => (
                              <div className="tk-inline-month" key={month}>
                                <small>
                                  {month.slice(5, 7)}
                                  {Number(month.slice(0, 4)) ===
                                  new Date().getFullYear()
                                    ? ""
                                    : "/" + month.slice(0, 4)}
                                </small>
                                {opts
                                  .filter((l) => l.b.ngay[0].startsWith(month))
                                  .map((l) => (
                                    <button
                                      type="button"
                                      key={l.key}
                                      aria-pressed={chartKeys.includes(l.key)}
                                      onClick={() => {
                                        setChartKeys((old) =>
                                          old.includes(l.key)
                                            ? old.filter((k) => k !== l.key)
                                            : [...old, l.key],
                                        );
                                        setChart(true);
                                        mark();
                                      }}
                                    >
                                      {c.chia === "ngay"
                                        ? l.b.ngay[0].slice(8)
                                        : chuKhoangNgay({
                                            tu: l.b.ngay[0],
                                            den: l.b.ngay.at(-1)!,
                                          })}
                                    </button>
                                  ))}
                              </div>
                            ))}
                        </div>
                      );
                    })}
                </div>
              </div>
            ))}
          </section>
          <RangePicker
            compact
            quickMonth
            start={chartTu}
            end={chartDen}
            onChange={(a, b) => {
              setChartHasPrivate(true);
              setChartTu(a);
              setChartDen(b);
              mark();
            }}
          />
          <button
            type="button"
            aria-label="Hiển thị biểu đồ thống kê"
            aria-pressed={chart}
            onClick={() => {
              setChart((v) => !v);
              mark();
            }}
          >
            {chart ? "Ẩn biểu đồ" : "Hiện biểu đồ"}
          </button>
        </div>
        <div className="tk-add-charts">
          <button
            type="button"
            disabled={!data || !chartRows.length || !chartLeaves.length}
            onClick={() => {
              setCards((old) => [...old, specFromSelection("bar")]);
              setChart(true);
              mark();
            }}
          >
            ＋ Biểu đồ cột
          </button>
          <button
            type="button"
            disabled={!data || !chartRows.length || !chartLeaves.length}
            onClick={() => {
              setCards((old) => [...old, specFromSelection("pie")]);
              setChart(true);
              mark();
            }}
          >
            ＋ Biểu đồ tròn
          </button>
        </div>
        {chart && (!chartRows.length || !chartLeaves.length) && (
          <p className="tk-empty-chart">
            Chọn hàng đối tượng và giá trị để vẽ biểu đồ.
          </p>
        )}

        <details className="tk-rules">
          <summary>Quy tắc tính số liệu</summary>
          <p>
            Thu/chi lấy từ sổ đã lưu. Đặt/hủy theo ngày tạo đơn tại Việt Nam.
            Đặt, giá và thời gian chỉ tính đơn đã xác nhận, nhận hoặc trả phòng;
            hủy tính đơn đã hủy. Các hàng tổng/chi nhánh/phòng có thể chồng nhau
            và không cộng lại thành một tổng mới.
          </p>
          <p>
            Trung bình ngày/tuần của thu, chi, giá và lượt chia cho tất cả
            ngày/tuần được chọn, kể cả không phát sinh. Thời gian lưu trú luôn
            là trung bình mỗi lượt đặt theo loại; chọn trung bình ngày/tuần để
            lấy trung bình các mức trung bình của ngày/tuần có đơn. Không có đơn
            hiển thị “—”.
          </p>
          <p>
            Lượt theo khung giờ chỉ dùng cho loại Theo giờ: chọn nhóm giờ bắt
            đầu có nhiều lượt nhất; nếu hòa chọn giờ sớm hơn. Khoảng đầu/cuối là
            trung bình các đơn trong nhóm, không phải thống kê công suất theo
            thời gian sử dụng phòng.
          </p>
          <p>
            Số dư toàn hệ thống dùng tiền tồn từng tháng; chi nhánh/phòng lũy kế
            khoản được gán, không tự chia tiền tồn chung. Cấu hình và kết quả
            không lưu DB. Xuất file trước khi đóng trang.
          </p>
        </details>
      </section>
      {chart &&
        data &&
        !tooLarge &&
        chartRows.length > 0 &&
        chartLeaves.length > 0 && (
          <div className="tk-primary-chart-pair">
            <BieuDoThongKe
              variant="bar"
              comparisonOnly={
                comparisonOnly ||
                chartLeaves.some(
                  (l) =>
                    l.c.cachTinh !== "tong" ||
                    ["so_du", "thoi_gian"].includes(l.c.chiSo),
                ) ||
                new Set(chartLeaves.map((l) => l.c.chiSo)).size > 1 ||
                chartLeaves.some((a, i) =>
                  chartLeaves.some(
                    (b, j) =>
                      j > i &&
                      a.c.chiSo === b.c.chiSo &&
                      a.b.ngay.some((d) => b.b.ngay.includes(d)),
                  ),
                )
              }
              pieReason="Biểu đồ tròn cần cùng chỉ số, các phần cộng được và không trùng nhau. Chọn tổng thu, tổng chi hoặc số lượt; không cộng trực tiếp số trung bình và số dư."
              title="Biểu đồ thống kê"
              unit={
                new Set(
                  chartLeaves.map(
                    (l) => CHI_SO.find((m) => m[0] === l.c.chiSo)?.[2],
                  ),
                ).size === 1
                  ? CHI_SO.find((m) => m[0] === chartLeaves[0].c.chiSo)?.[2] ||
                    ""
                  : "nhiều đơn vị"
              }
              points={chartLeaves.flatMap((l) =>
                chartRows.map((p) => ({
                  id: l.key + ":" + p.key,
                  calc: CALCS.find((g) => g.id === l.c.cachTinh)?.ten || "Tổng",
                  category:
                    p.loai === "phong"
                      ? "Phòng"
                      : p.loai === "chi_nhanh"
                        ? "Chi nhánh"
                        : "Tổng",
                  branch:
                    p.loai === "phong"
                      ? data.chi_nhanh.find((b) => b.id === p.branch)
                          ?.ten_homestay
                      : undefined,
                  unit: CHI_SO.find((m) => m[0] === l.c.chiSo)?.[2] || "",
                  ten:
                    p.ten +
                    " · " +
                    tenCot(l.c) +
                    (l.b.key !== "chung" ? " · " + l.b.ten : ""),
                  value: tinhGiaTri(
                    data,
                    p,
                    l.c,
                    l.b.ngay.filter((d) => d >= chartTu && d <= chartDen),
                  ),
                })),
              )}
            />
            <BieuDoBoSung
              spec={primaryPieSpec}
              onChange={(spec) => {
                setPrimaryPie({
                  ranges: spec.ranges,
                  customCalendar: spec.customCalendar,
                  group: spec.group,
                  metricId: spec.metricId,
                });
                mark();
              }}
              token={token}
              data={data}
              dataStart={from}
              dataEnd={to}
            />
          </div>
        )}
      {chart &&
        data &&
        !tooLarge &&
        cards.map((spec) => (
          <BieuDoBoSung
            key={spec.id}
            spec={spec}
            onChange={(next) => {
              setCards((old) => old.map((c) => (c.id === next.id ? next : c)));
              mark();
            }}
            onRemove={() => {
              setCards((old) => old.filter((c) => c.id !== spec.id));
              mark();
            }}
            token={token}
            data={data}
            dataStart={from}
            dataEnd={to}
          />
        ))}
    </section>
  );
}
