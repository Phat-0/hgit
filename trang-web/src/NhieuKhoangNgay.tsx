import { RangePicker } from "./RangePicker";
export type KhoangNgay = { tu: string; den: string };
export function NhieuKhoangNgay({
  ranges,
  onChange,
}: {
  ranges: KhoangNgay[];
  onChange: (r: KhoangNgay[]) => void;
}) {
  const first = ranges[0];
  return (
    <div className="tk-multi-ranges" aria-label="Lịch riêng của giá trị">
      <RangePicker
        compact
        quickMonth
        start={first?.tu || ""}
        end={first?.den || ""}
        placeholder={
          !first
            ? "Chọn lịch riêng"
            : ranges.length > 1
              ? `${ranges.length} khoảng ngày`
              : undefined
        }
        onChange={() => {}}
        ranges={ranges}
        onRangesChange={onChange}
      />
    </div>
  );
}
