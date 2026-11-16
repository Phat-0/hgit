import { chuCacKhoang } from "./lich-hien-thi";
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
        ariaLabel="Lịch riêng"
        quickMonth
        start={first?.tu || ""}
        end={first?.den || ""}
        placeholder={!first ? " " : chuCacKhoang(ranges)}
        onChange={() => {}}
        ranges={ranges}
        onRangesChange={onChange}
      />
    </div>
  );
}
