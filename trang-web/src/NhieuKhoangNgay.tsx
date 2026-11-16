import { RangePicker } from "./RangePicker";
export type KhoangNgay = { tu: string; den: string };
export function NhieuKhoangNgay({
  ranges,
  onChange,
}: {
  ranges: KhoangNgay[];
  onChange: (r: KhoangNgay[]) => void;
}) {
  return (
    <div className="tk-multi-ranges" aria-label="Lịch riêng của giá trị">
      {(ranges.length ? ranges : [{ tu: "", den: "" }]).map((r, i) => (
        <div key={i}>
          <RangePicker
            compact
            quickMonth
            start={r.tu}
            end={r.den}
            placeholder={!r.tu ? "Chọn lịch riêng" : undefined}
            onChange={(tu, den) =>
              onChange(
                [
                  ...ranges.slice(0, i),
                  { tu, den },
                  ...ranges.slice(i + 1),
                ].sort((a, b) => a.tu.localeCompare(b.tu)),
              )
            }
          />
          {ranges.length > 0 && (
            <button
              type="button"
              aria-label={"Bỏ khoảng ngày " + (i + 1)}
              onClick={() => onChange(ranges.filter((_, j) => j !== i))}
            >
              ×
            </button>
          )}
        </div>
      ))}
      {ranges.length > 0 && ranges.length < 12 && (
        <RangePicker
          compact
          quickMonth
          start=""
          end=""
          placeholder="＋ Khoảng"
          onChange={(tu, den) =>
            onChange(
              [...ranges, { tu, den }].sort((a, b) => a.tu.localeCompare(b.tu)),
            )
          }
        />
      )}
    </div>
  );
}
