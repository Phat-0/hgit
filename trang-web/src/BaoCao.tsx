import SoThuChi from "./SoThuChi";
import BaoCaoDatPhong from "./BaoCaoDatPhong";
import type { Go } from "./bao-cao-api";
export default function BaoCao(props: {
  token: string;
  initial?: { tu_ngay?: string; den_ngay?: string };
  onGo: Go;
}) {
  return (
    <div className="bc-page">
      <SoThuChi token={props.token} initial={props.initial} />
      <details className="stc-legacy">
        <summary>Thống kê đặt phòng, doanh thu và tần suất phòng</summary>
        <BaoCaoDatPhong {...props} />
      </details>
    </div>
  );
}
