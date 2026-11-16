export function SapXepTrucTiep({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: [string, string][];
}) {
  return (
    <section className="bd-sort" role="group" aria-label={label}>
      <h4>Sắp xếp</h4>
      <div>
        {options.map(([id, ten]) => (
          <button
            type="button"
            key={id}
            aria-pressed={value === id}
            onClick={() => onChange(id)}
          >
            {ten}
          </button>
        ))}
      </div>
    </section>
  );
}
export function XuatBieuDo({
  label,
  onExport,
  disabled = false,
}: {
  label: string;
  onExport: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <section className="bd-export" role="group" aria-label={label}>
      <h4>Xuất biểu đồ</h4>
      <div>
        {(
          [
            ["svg", "SVG", "Hình ảnh sắc nét"],
            ["xlsx", "Excel", "Dữ liệu bảng"],
            ["csv", "CSV", "Dữ liệu văn bản"],
          ] as const
        ).map(([id, ten, desc]) => (
          <button
            type="button"
            key={id}
            disabled={disabled}
            onClick={(e) => {
              onExport(id);
              e.currentTarget
                .closest(".stc-check-picker")
                ?.removeAttribute("open");
            }}
          >
            <span className={"bd-file-icon bd-file-" + id}>
              {id === "svg" ? "▧" : id === "xlsx" ? "▤" : "≡"}
            </span>
            <span>
              <strong>{ten}</strong>
              <small>{desc}</small>
            </span>
            <span aria-hidden="true">↓</span>
          </button>
        ))}
      </div>
    </section>
  );
}
