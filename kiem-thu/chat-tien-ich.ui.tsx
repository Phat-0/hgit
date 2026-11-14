import { JSDOM } from "jsdom";
import assert from "node:assert/strict";
const dom = new JSDOM('<div id="root"></div>', {
  url: "https://home.test",
  pretendToBeVisual: true,
});
Object.assign(globalThis, {
  window: dom.window,
  document: dom.window.document,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  sessionStorage: dom.window.sessionStorage,
  localStorage: dom.window.localStorage,
  FormData: dom.window.FormData,
  File: dom.window.File,
  IS_REACT_ACT_ENVIRONMENT: true,
  ResizeObserver:class{observe(){} disconnect(){}},
});
window.confirm = () => true;
dom.window.HTMLElement.prototype.scrollIntoView = () => {};
URL.createObjectURL = () => "blob:preview";
URL.revokeObjectURL = () => {};
const React = await import("../trang-web/node_modules/react/index.js");
const { act } = React;
const { createRoot } =
  await import("../trang-web/node_modules/react-dom/client.js");
const { default: TroChuyen } = await import("../trang-web/src/TroChuyen.tsx");
const { default: ThongBaoDon } =
  await import("../trang-web/src/ThongBaoDon.tsx");
const now = new Date().toISOString();
const f = {
  id: "f1",
  tin_nhan_id: "m2",
  ten_tep: "huong-dan.pdf",
  mime: "application/pdf",
  dung_luong: 100,
  la_anh: false,
  url: "https://storage.test/private.pdf",
  ngay_tao: now,
};
let rows: any[] = [
    {
      id: "m1",
      cua_toi: false,
      nguoi_gui_id: "staff",
      ten_nguoi_gui: "Hỗ trợ HomeStay",
      noi_dung: "Xin chào",
      ngay_gui: now,
    },
  ],
  read: string[] = [],
  oldCalls = 0,
  sent: string[] = [],
  uploads = 0,
  noticesRead = false;
let templates: any[] = [
  {
    id: "r1",
    tieu_de: "Chào hỏi",
    nhom: "Chào",
    noi_dung: "Xin chào bạn!",
    homestay_id: null,
    hien: true,
  },
  {
    id: "r3",
    tieu_de: "Cần tên",
    nhom: "Chào",
    noi_dung: "Chào {{ten_khach}}",
    homestay_id: null,
    hien: true,
  },
];
let updatedTemplate: any,
  deletedTemplate = "";
let reordered: string[] = [];
globalThis.fetch = async (url: any, o: any = {}) => {
  const p = String(url),
    u = new URL(p, "https://home.test");
  let d: any;
  if (p.includes("/thong-bao-don")) {
    if (o.method === "POST") {
      noticesRead = true;
      d = { ok: true };
    } else {
      d = {
        thong_bao:
          u.searchParams.get("loai") === "Đơn hủy"
            ? []
            : [
                {
                  id: "n1",
                  tieu_de: "Đơn mới · DP01",
                  noi_dung: "Khách An",
                  loai: "Đơn mới",
                  da_doc_luc: noticesRead ? now : null,
                  ngay_tao: now,
                  du_lieu: { dat_phong_id: "d1" },
                },
              ],
        chua_doc: noticesRead ? 0 : 1,
        tong_so: 1,
      };
      if (!d.thong_bao.length) d.tong_so = 0;
    }
  } else if (p.includes("/quan-tri/lich-phong/don-dat-phong/d1"))
    d = {
      id: "d1",
      ma_dat_phong: "DP01",
      ten_khach: "Khách An",
      ten_phong: "P01",
      ten_homestay: "A",
      nhan_phong_luc: now,
      tra_phong_luc: now,
      hinh_thuc_dat: "Theo giờ",
      so_khach: 1,
      tien_phong: "200000",
      tong_tien: "200000",
      ngay_tao: now,
    };
  else if (p.includes("/quan-tri/cau-tra-loi-mau")) {
    if (p.endsWith("/thu-tu")) {
      reordered = JSON.parse(o.body).ids;
      d = { ok: true };
    } else if (o.method === "POST") {
      templates.push({ id: "r2", ...JSON.parse(o.body) });
      d = templates.at(-1);
    } else if(o.method==='PUT'){updatedTemplate=JSON.parse(o.body);templates=templates.map(m=>p.endsWith('/'+m.id)?{...m,...updatedTemplate}:m);d={ok:true};}else if(o.method==='DELETE'){deletedTemplate=p.split('/').at(-1)!;templates=templates.filter(m=>m.id!==deletedTemplate);d={ok:true};}else d={mau:templates,chi_nhanh:[]};
  } else if (p.endsWith("/cau-tra-loi"))
    d = {
      mau: [
        {
          id: "r1",
          tieu_de: "Chào hỏi",
          nhom: "Chào",
          noi_dung_da_dien: "Xin chào bạn!",
          du_gui_ngay: true,
        },
        {
          id: "r3",
          tieu_de: "Cần tên",
          nhom: "Chào",
          noi_dung_da_dien: "Chào {{ten_khach}}",
          du_gui_ngay: false,
        },
      ],
    };
  else if (p.includes("/chat?"))
    d = {
      toi: "u",
      hoi_thoai: [
        {
          id: "t1",
          loai: "ho_tro",
          ten_hien_thi: "Khách An",
          ten_homestay: "A",
          tin_cuoi: "Xin chào",
          tin_cuoi_luc: now,
          chua_doc: 0,
        },
      ],
      tong_so: 1,
      tong_chua_doc: 0,
    };
  else if (p.endsWith("/chat") && o.method === "POST")
    d = { id: "t1", guest_token: "a".repeat(64) };
  else if (p.endsWith("/da-doc")) {
    read.push(JSON.parse(o.body).tin_nhan_id);
    d = { ok: true };
  } else if (p.includes("/tin-nhan")) {
    if (o.method === "POST") {
      const b = JSON.parse(o.body);
      sent.push(b.noi_dung);
      rows.push({
        id: "m" + (rows.length + 1),
        cua_toi: true,
        ten_nguoi_gui: "Bạn",
        noi_dung: b.noi_dung,
        ngay_gui: now,
      });
      d = { ok: true };
    } else if (u.searchParams.has("truoc")) {
      oldCalls++;
      d = {
        tin_nhan: [
          {
            id: "older",
            cua_toi: false,
            ten_nguoi_gui: "Hỗ trợ HomeStay",
            noi_dung: "Tin cũ hơn",
            ngay_gui: "2026-01-01T00:00:00Z",
          },
        ],
        co_tin_cu: false,
      };
    } else if (u.searchParams.has("den"))
      d = { tin_nhan: rows.slice(0, 1), co_tin_cu: false };
    else
      d = {
        tin_nhan: rows,
        co_tin_cu: true,
        duoc_dung_mau: o.headers?.Authorization === "Bearer admin",
      };
  } else if (p.includes("/tep")) {
    if (o.method === "POST") {
      uploads++;
      assert.equal(o.body.get("file").name, "huong-dan.pdf");
      rows.push({
        id: "m2",
        cua_toi: true,
        ten_nguoi_gui: "Bạn",
        noi_dung: "Đã gửi tệp",
        ngay_gui: now,
        tep: f,
      });
      d = { ok: true };
    } else
      d = {
        tep: u.searchParams.get("loai") === "anh" ? [] : [f],
        con_tiep: false,
      };
  } else if (p.includes("/tim?"))
    d = {
      tin_nhan: [{ id: "m1", noi_dung: "Xin chào", ngay_gui: now }],
      con_tiep: false,
    };
  else throw Error("Unexpected " + p);
  return { ok: true, json: async () => d } as any;
};
const wait = async (ms = 40) =>
  act(async () => {
    await new Promise((r) => setTimeout(r, ms));
  });
const click = async (e: Element | null) => {
  assert.ok(e);
  await act(async () =>
    e.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })),
  );
};
const edit = async (
  e: HTMLInputElement | HTMLTextAreaElement,
  text: string,
) => {
  assert.ok(e);
  await act(async () => {
    const proto =
      e.tagName === "TEXTAREA"
        ? dom.window.HTMLTextAreaElement.prototype
        : dom.window.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, "value")!.set!.call(e, text);
    e.dispatchEvent(new dom.window.Event("input", { bubbles: true }));
  });
};
const submit = async (e: Element | null) => {
  assert.ok(e);
  await act(async () =>
    e.dispatchEvent(
      new dom.window.Event("submit", { bubbles: true, cancelable: true }),
    ),
  );
};
const byText = (text: string) =>
  [...document.querySelectorAll("button")].find((x) => x.textContent === text)!;
let root = createRoot(document.getElementById("root")!);
await act(async () => root.render(<TroChuyen token="customer" />));
await click(document.querySelector(".chat-launch"));
await wait();
assert.ok(document.querySelector(".chat-simple"));
assert.equal(document.querySelector(".chat-body aside"), null);
assert.equal(document.querySelector(".chat-launch")!.textContent, "");
assert.equal(
  document.querySelector('[aria-label="Câu trả lời soạn sẵn"]'),
  null,
);
assert.equal(
  document
    .querySelector('[aria-label="Nội dung tin nhắn"]')!
    .hasAttribute("disabled"),
  false,
);
const viewport = document.querySelector(".chat-messages") as HTMLElement;
Object.defineProperty(viewport, "scrollHeight", {
  get: () =>
    1000 + 100 * document.querySelectorAll(".chat-messages article").length,
});
Object.defineProperty(viewport, "clientHeight", { get: () => 300 });
await act(async () => {
  viewport.scrollTop = 0;
  viewport.dispatchEvent(new dom.window.Event("scroll", { bubbles: true }));
  viewport.dispatchEvent(new dom.window.Event("scroll", { bubbles: true }));
});
await wait();
assert.equal(oldCalls, 1);
assert.match(viewport.textContent!, /Tin cũ hơn/);
assert.equal(viewport.scrollTop, 100);
assert.equal(byText("Tải tin trước"), undefined);
const fi = document.querySelector(
  'input[type=file][accept*="application/pdf"]',
) as HTMLInputElement;
Object.defineProperty(fi, "files", {
  configurable: true,
  value: [
    new dom.window.File(["%PDF-1.7"], "huong-dan.pdf", {
      type: "application/pdf",
    }),
  ],
});
await act(async () =>
  fi.dispatchEvent(new dom.window.Event("change", { bubbles: true })),
);
assert.match(
  document.querySelector(".chat-file-preview")!.textContent!,
  /huong-dan.pdf/,
);
await submit(document.querySelector(".chat-main form"));
await wait();
assert.equal(uploads, 1);
assert.ok(document.querySelector(".chat-attachment a"));
assert.equal(document.querySelector(".chat-file-preview"), null);
await click(document.querySelector('[aria-label="Xem tệp đã gửi"]'));
await wait(300);
assert.match(
  document.querySelector(".chat-tool-results")!.textContent!,
  /huong-dan.pdf/,
);
await click(document.querySelector('[aria-label="Đóng công cụ chat"]'));
await click(document.querySelector('[aria-label="Tìm tin nhắn"]'));
await edit(
  document.querySelector('[aria-label="Tìm trong công cụ chat"]')!,
  "Xin chào",
);
await wait(300);
await click(document.querySelector(".chat-search-hit"));
await wait();
assert.match(
  document.querySelector(".chat-context-back")!.textContent!,
  /Về tin mới/,
);
await click(document.querySelector(".chat-context-back"));
await wait();
const launcher = document.querySelector(".chat-launch") as HTMLButtonElement;
const pointer = async (type: string, x: number, y: number) =>
  act(async () => {
    const e = new dom.window.MouseEvent(type, {
      bubbles: true,
      cancelable: true,
      button: 0,
      clientX: x,
      clientY: y,
    });
    Object.defineProperty(e, "pointerId", { value: 1 });
    launcher.dispatchEvent(e);
  });
await pointer("pointerdown", 960, 700);
await pointer("pointermove", 200, 210);
await pointer("pointerup", 200, 210);
await click(launcher);
assert.ok(document.querySelector(".chat-window"));
const savedPosition = JSON.parse(
  localStorage.getItem("homestay_chat_position:guest")!,
);
assert.ok(savedPosition.x < 300);
await act(async () =>
  launcher.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      bubbles: true,
      key: "ArrowRight",
    }),
  ),
);
assert.equal(
  JSON.parse(localStorage.getItem("homestay_chat_position:guest")!).x,
  savedPosition.x + 10,
);
await click(document.querySelector('[aria-label="Thu gọn bong bóng chat"]'));
assert.equal(document.querySelector(".chat-launch"), null);
assert.ok(document.querySelector('[aria-label="Mở lại bong bóng chat"]'));
await click(document.querySelector('[aria-label="Mở lại bong bóng chat"]'));
assert.ok(document.querySelector(".chat-launch"));
assert.equal(document.querySelector(".chat-window"), null);
await act(async () =>
  window.dispatchEvent(new dom.window.Event("homestay:mo-chat")),
);
await wait();
assert.ok(document.querySelector(".chat-window"));
await act(async () => root.unmount());
root = createRoot(document.getElementById("root")!);
await act(async () =>
  root.render(
    <>
      <TroChuyen token="admin" admin inline />
      <ThongBaoDon token="admin" />
    </>,
  ),
);
await wait();
assert.ok(document.querySelector(".chat-body > aside"), "Hộp thư quản trị giữ sidebar");
assert.equal(document.querySelector(".chat-launch"), null, "Không để bong bóng đè nút gửi trong hộp thư");
assert.equal(document.querySelector(".chat-dock-handle"), null);
await click(document.querySelector(".chat-thread"));
await wait();
for (const label of ["Chọn ảnh", "Chọn tệp"]) {
  const button = document.querySelector(`[aria-label="${label}"]`)!;
  assert.equal(button.textContent?.trim(), "");
  assert.equal(button.getAttribute("title"), label);
}
assert.equal(document.querySelectorAll('.chat-compose-tools input[type="file"][hidden]').length, 2);
assert.ok(document.querySelector('.chat-main form input:not([type="file"])'));
assert.ok(document.querySelector('.chat-main form button[type="submit"]'));
await click(document.querySelector('[aria-label="Câu trả lời soạn sẵn"]'));
await wait(300);
assert.ok(document.querySelector(".chat-reply-grid"));
await click(document.querySelector('[aria-label="Sắp xếp mẫu"]'));
await act(async () =>
  document.querySelector(".chat-reply")!.dispatchEvent(
    new dom.window.KeyboardEvent("keydown", {
      bubbles: true,
      key: "ArrowDown",
    }),
  ),
);
await wait(300);
assert.deepEqual(reordered, ["r3", "r1"]);
await click(document.querySelector('[aria-label="Sắp xếp mẫu"]'));
await click(document.querySelector(".chat-reply"));
await wait();
assert.ok(sent.includes("Xin chào bạn!"));
await click(document.querySelector('[aria-label="Câu trả lời soạn sẵn"]'));
await wait(300);
await click(document.querySelectorAll(".chat-reply")[1]);
assert.equal(
  (
    document.querySelector(
      '[aria-label="Nội dung tin nhắn"]',
    ) as HTMLInputElement
  ).value,
  "Chào {{ten_khach}}",
);
assert.ok(document.querySelector(".chat-hint"));
await click(document.querySelector('[aria-label="Câu trả lời soạn sẵn"]'));
await wait(300);
await click(document.querySelector('[aria-label="Thêm câu trả lời"]'));
assert.ok(document.querySelector(".chat-template-dialog"));
const form = document.querySelector(".chat-template-grid form")!;
await edit(form.querySelectorAll("input")[0], "Mẫu test");
await edit(form.querySelector("textarea")!, "Nội dung test");
await submit(form);
await wait();
assert.equal(templates.at(-1).tieu_de, "Mẫu test");
await click(document.querySelector('[aria-label="Đóng quản lý câu trả lời"]'));
await wait(300);
await click(document.querySelector('[aria-label="Chọn mẫu để sửa"]'));
await click(document.querySelector(".chat-reply"));
await wait();
assert.equal(
  (
    document.querySelector(
      ".chat-template-grid textarea",
    ) as HTMLTextAreaElement
  ).value,
  "Xin chào bạn!",
);
await edit(
  document.querySelector(".chat-template-grid textarea")!,
  "Mẫu đã sửa từ ô",
);
await submit(document.querySelector(".chat-template-grid form"));
await wait();
assert.equal(updatedTemplate.noi_dung, "Mẫu đã sửa từ ô");
assert.equal(updatedTemplate.id, undefined);
await click(document.querySelector('[aria-label="Đóng quản lý câu trả lời"]'));
await wait(300);
await click(document.querySelector('[aria-label="Chọn mẫu để xóa"]'));
await click(document.querySelectorAll(".chat-reply")[1]);
await wait();
assert.equal(deletedTemplate, "r3");
assert.equal(document.querySelectorAll(".chat-reply").length, 1);

await click(document.querySelector('[aria-label="Đóng công cụ chat"]'));
await click(document.querySelector(".qt-booking-bell>button"));
assert.match(
  document.querySelector(".qt-notice-panel")!.textContent!,
  /Đơn mới · DP01/,
);
await click(document.querySelector(".qt-notice-list>button"));
await wait();
assert.ok(document.querySelector('[aria-label="Chi tiết đơn đặt phòng"]'));
assert.equal(noticesRead, true);
assert.equal(document.querySelector(".qt-notice-panel"), null);
await act(async () => root.unmount());
// Tạo/sửa đơn dùng chung cho Lịch và Đơn đặt phòng.
const {default:FormDonDatPhong}=await import('../trang-web/src/FormDonDatPhong.tsx');
const {tinhGiaDon}=await import('../trang-web/src/tinh-gia-don.ts');
const roomPrices={so_gio_toi_thieu:2,gia_moi_gio:200000,gia_moi_dem:500000,gia_moi_ngay:700000,gia_phu_thu_gio:50000};
const hours={gio_tu:'08:00',gio_den:'22:00',ngay_tu:'14:00',ngay_den:'12:00',dem_tu:'20:00',dem_den:'08:00'};
assert.equal(tinhGiaDon(roomPrices,'gio',new Date('2030-01-01T08:00:00+07:00'),new Date('2030-01-01T11:00:00+07:00'),hours),250000);
assert.equal(tinhGiaDon(roomPrices,'dem',new Date('2030-01-01T20:00:00+07:00'),new Date('2030-01-02T08:00:00+07:00'),hours),500000);
let savedOrder:any=null;
globalThis.fetch=async (url:any,init:any={})=>{if(init.method==='POST'||init.method==='PUT')savedOrder=JSON.parse(init.body);return {ok:true,json:async()=>init.method==='POST'||init.method==='PUT'?{id:'created'}:{rooms:[{...roomPrices,id:'r1',homestay_id:'b1',ten_homestay:'Chi nhánh 1',ten_phong:'Phòng 101',ten_loai:'Cao cấp',cho_dat_theo_gio:true,cho_dat_theo_ngay:true,cho_dat_theo_dem:true},{...roomPrices,id:'r2',homestay_id:'b1',ten_homestay:'Chi nhánh 1',ten_phong:'Phòng 102',ten_loai:'Cao cấp',cho_dat_theo_gio:true,cho_dat_theo_ngay:true,cho_dat_theo_dem:true}],combos:[],cau_hinh_gio:hours}} as any;};
root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<FormDonDatPhong token="admin" seed={{phong_id:'r1',date:'2030-01-01',kind:'gio',time:'08:00'}} onClose={()=>{}} onSaved={async()=>{}}/>));
await wait();
const field=(name:string)=>[...document.querySelectorAll('.fd-fields>label')].find(e=>e.firstChild?.textContent===name)!;
assert.equal((field('Tiền phòng').querySelector('input') as HTMLInputElement).value,'200.000');
await act(async()=>{const el=field('Loại phòng muốn đặt').querySelector('select')!;el.value='dem';el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});
await wait();
assert.match(document.querySelector('.fd-summary')!.textContent!,/20:00/);assert.match(document.querySelector('.fd-summary')!.textContent!,/08:00/);
assert.equal((field('Tiền phòng').querySelector('input') as HTMLInputElement).value,'500.000');
await edit(field('Tên khách hàng').querySelector('input')!,'Khách kiểm thử');
await edit(field('Số điện thoại').querySelector('input')!,'0901234567');
await submit(document.querySelector('.fd-dialog form'));await wait();
assert.equal(savedOrder.hinh_thuc_dat,'Theo đêm');assert.equal(savedOrder.so_dien_thoai,'0901234567');assert.equal(savedOrder.tien_phong,500000);
assert.equal((Date.parse(savedOrder.tra_phong_luc)-Date.parse(savedOrder.nhan_phong_luc))/3600000,12);
await act(async()=>root.unmount());root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<FormDonDatPhong token="admin" don={{id:'d1',phong_id:'r1',ten_khach:'Khách cũ',so_dien_thoai:'0901234567',hinh_thuc_dat:'Theo giờ',nhan_phong_luc:'2030-01-01T08:00:00+07:00',tra_phong_luc:'2030-01-01T10:00:00+07:00',so_khach:1,tien_phong:'200000',ghi_chu:'',ten_phong:'Phòng 101'}} onClose={()=>{}} onSaved={async()=>{}}/>));await wait();
await act(async()=>{const el=field('Phòng').querySelector('select')!;el.value='r2';el.dispatchEvent(new dom.window.Event('change',{bubbles:true}));});await wait();
assert.match(document.querySelector('.fd-changes')!.textContent!,/Phòng 101 → Phòng 102/);
await act(async()=>root.unmount());
console.log('PASS Form đơn chung: tự tính giờ/phụ thu/đêm, check-in/check-out qua ngày, dữ liệu POST đúng và xem trước đổi phòng.');
root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<FormDonDatPhong token="admin" don={{id:'old-night',phong_id:'r1',ten_khach:'Khách giờ cũ',so_dien_thoai:'0901234567',hinh_thuc_dat:'Theo đêm',nhan_phong_luc:'2030-01-01T19:00:00+07:00',tra_phong_luc:'2030-01-02T07:00:00+07:00',so_khach:1,tien_phong:'500000',ghi_chu:'',ten_phong:'Phòng 101'}} onClose={()=>{}} onSaved={async()=>{}}/>));await wait();
assert.match(document.querySelector('.fd-summary')!.textContent!,/19:00/);assert.match(document.querySelector('.fd-summary')!.textContent!,/07:00/);assert.equal(document.querySelector('.fd-changes'),null);
await act(async()=>root.unmount());
const {duLieuGiaoDien}=await import('./du-lieu-giao-dien.mjs');
let routeHandler:any;
const fixtures=await duLieuGiaoDien({context:()=>({addInitScript:async()=>{}}),route:async(_p:any,handler:any)=>{routeHandler=handler}} as any);
const uiRequests:string[]=[];
globalThis.fetch=async(url:any,init:any={})=>new Promise(resolve=>{const full=new URL(url,'https://home.test').href;uiRequests.push(full);void routeHandler({request:()=>({url:()=>full,method:()=>init.method||'GET'}),fulfill:async({status,body}:any)=>resolve({ok:status<400,json:async()=>JSON.parse(body)} as any)});});
const {default:TongQuan}=await import('../trang-web/src/TongQuan.tsx');
const {default:BaoCao}=await import('../trang-web/src/BaoCao.tsx');
const {default:DanhGia}=await import('../trang-web/src/DanhGia.tsx');
const {default:ComboPage}=await import('../trang-web/src/GoiGiaCombo.tsx');
const {default:TrangChuQuanTri}=await import('../trang-web/src/TrangChuQuanTri.tsx');
const {default:VaiTroNhanVien}=await import('../trang-web/src/VaiTroNhanVien.tsx');
const goCalls:any[]=[];
const go=(page:string,filter?:any)=>{goCalls.push([page,filter]);};
root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<TongQuan token="admin" onGo={go}/>));await wait();
assert.equal(document.querySelectorAll('.qt-stats>[role=button]').length,5);assert.doesNotMatch(document.querySelector('.qt-stats')!.textContent!,/Dữ liệu thực tế/);
await click([...document.querySelectorAll('.qt-stats>[role=button]')].find(e=>e.textContent?.includes('Đánh giá'))!);assert.equal(goCalls.at(-1)[0],'danh-gia');
await click(document.querySelector('.dt-column'));assert.equal(goCalls.at(-1)[0],'danh-gia');assert.ok(goCalls.at(-1)[1].tu_ngay);
await click(document.querySelector('.qt-stats>[role=button]'));assert.equal(goCalls.at(-1)[0],'bao-cao');
await act(async()=>root.unmount());root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<BaoCao token="admin" onGo={go}/>));await wait();
assert.equal(document.querySelectorAll('.stc-sheet tbody tr').length,2);
assert.equal(document.querySelectorAll('.stc-sheet th').length,9);assert.equal(document.querySelector('.stc-row-actions'),null);assert.ok(document.querySelector('.stc-add-row'));assert.equal([...document.querySelectorAll('button')].some(e=>e.textContent==='Thay đổi'),false);
await edit(document.querySelector('[aria-label="Tiền tồn đầu tháng"]') as HTMLInputElement,'1500');assert.ok([...document.querySelectorAll('button')].some(e=>e.textContent==='Thay đổi'));await edit(document.querySelector('[aria-label="Tiền tồn đầu tháng"]') as HTMLInputElement,'1000');assert.equal([...document.querySelectorAll('button')].some(e=>e.textContent==='Thay đổi'),false);

const {csvThuChi,xlsxThuChi}=await import('../trang-web/src/xuat-so-thu-chi.ts');
assert.match(csvThuChi([['=cmd',-50000]]),/"'=cmd","-50000"/);
const exportBuffer=xlsxThuChi([{name:'Sổ thu chi',rows:[['Tên','Tiền'],['=không thực thi',-50000]]}]);
const fsExport=await import('node:fs');fsExport.writeFileSync('/tmp/hgit-kiem-thu-xuat.xlsx',new Uint8Array(exportBuffer));
assert.equal(new DataView(exportBuffer).getUint32(0,true),0x04034b50);

assert.match(document.querySelector('.stc-kind-tabs')!.textContent!,/1.250.000/);
const rowChecks=document.querySelectorAll('.stc-sheet tbody .stc-select-cell input');
await click(rowChecks[0]);await click(rowChecks[1]);
assert.equal(document.querySelectorAll('.stc-selected-row').length,2);
assert.equal(document.querySelector('.stc-selected'),null);
assert.match(document.querySelector('.stc-row-selection-total strong')!.textContent!,/250.000/);
const clearRows=document.querySelector('[aria-label="Bỏ chọn hàng"]')!;assert.doesNotMatch(clearRows.textContent!,/Bỏ chọn/);await click(clearRows);assert.equal(document.querySelectorAll('.stc-selected-row').length,0);
const columnHandle=document.querySelector('[role="separator"]')!;const oldWidth=Number(columnHandle.getAttribute('aria-valuenow'));
await act(async()=>columnHandle.dispatchEvent(new dom.window.MouseEvent('pointerdown',{bubbles:true,clientX:100,buttons:1})));
await act(async()=>window.dispatchEvent(new dom.window.MouseEvent('pointermove',{clientX:160,buttons:1})));
await act(async()=>window.dispatchEvent(new dom.window.MouseEvent('pointerup')));
assert.equal(Number(columnHandle.getAttribute('aria-valuenow')),oldWidth+60);
await act(async()=>columnHandle.dispatchEvent(new dom.window.KeyboardEvent('keydown',{key:'Home',bubbles:true})));
assert.equal(Number(columnHandle.getAttribute('aria-valuenow')),oldWidth);
const firstKind=document.querySelector('.stc-sheet [aria-label="Thu hoặc chi"]') as HTMLSelectElement;
await act(async()=>{firstKind.value='Chi';firstKind.dispatchEvent(new dom.window.Event('change',{bubbles:true}))});
assert.equal((document.querySelector('.stc-sheet [aria-label="Số tiền thu chi"]') as HTMLInputElement).value,'-300.000');
assert.match(document.querySelector('.stc-kind-tabs')!.textContent!,/1.250.000/);
await click(document.querySelector('.stc-charts input[type=checkbox]'));
assert.match(document.querySelector('.stc-chart-grid figcaption')!.textContent!,/%/);
const {tongDong}=await import('../trang-web/src/so-thu-chi.ts');
assert.deepEqual(tongDong([{so_tien:300000},{so_tien:-50000}] as any),{tong:250000,thu:300000,chi:-50000});
await click(document.querySelector('.stc-compact-toolbar .lp-range-button'));
assert.ok(document.querySelector('.lp-calendar-pair'));assert.ok(document.querySelector('[aria-label="Chọn nhanh tháng"]'));
await edit(document.querySelector('[aria-label="Chọn nhanh tháng"]') as HTMLInputElement,'2028-02');
await click([...document.querySelectorAll('.lp-range-portal button')].find(e=>e.textContent==='Chọn tháng')!);await wait();
assert.ok(uiRequests.some(u=>u.includes('/thu-chi?')&&u.includes('tu_ngay=2028-02-01')&&u.includes('den_ngay=2028-02-29')));
await click(document.querySelector('.stc-add-row'));assert.equal((document.querySelector('[data-row-id="moi"] [aria-label="Ngày thu chi"]') as HTMLInputElement).value,fixtures.today);
await click(document.querySelector('[aria-label="Hoàn tác hàng đã chọn"]'));assert.equal(document.querySelector('[data-row-id="moi"]'),null);
await click(document.querySelector('.stc-compact-toolbar .lp-range-button'));
await click([...document.querySelectorAll('.lp-calendar-month')][0].querySelectorAll('button')[9]);
await click([...document.querySelectorAll('.lp-calendar-month')][0].querySelectorAll('button')[11]);await wait();
assert.ok(uiRequests.some(u=>u.includes('/thu-chi?')&&u.includes('tu_ngay=2028-02-10')&&u.includes('den_ngay=2028-02-12')));
assert.equal(document.querySelectorAll('.stc-period-total .lp-range-button').length,1);assert.equal(document.querySelectorAll('.stc-period-stats>span').length,3);
console.log('PASS UI thu chi: chọn cả hàng/bỏ chọn bằng icon, kéo rộng cột, tháng nhuận/chọn ngày giữ nguyên, dòng mới dùng ngày hiện tại và tổng thu/chi tách tiền tồn.');
assert.match(document.querySelector('.bc-page')!.textContent!,/Tiền đã thu/);assert.match(document.querySelector('.bc-page')!.textContent!,/Theo thanh toán/);assert.match(document.querySelector('.bc-page')!.textContent!,/Đánh giá trong kỳ/);
await act(async()=>root.unmount());root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<DanhGia token="admin" initial={{tu_ngay:fixtures.today,den_ngay:fixtures.today}}/>));await wait(250);
assert.match(document.querySelector('.dg-list')!.textContent!,/Nguyễn Văn An/);assert.ok(uiRequests.some(u=>u.includes('/danh-gia?')&&u.includes('tu_ngay='+fixtures.today)));
await act(async()=>root.unmount());root=createRoot(document.getElementById('root')!);
window.matchMedia=()=>({matches:true,addListener(){},removeListener(){},addEventListener(){},removeEventListener(){},dispatchEvent(){return true},media:''}) as any;
await act(async()=>root.render(<ComboPage token="admin"/>));await wait();
assert.equal(document.querySelectorAll('.cm-card').length,8);assert.equal(document.querySelector('.cm-column'),null);
await click(document.querySelector('.cm-card'));await wait();assert.ok(document.querySelector('.cm-cards>.cm-detail-row'));assert.equal(document.querySelector('.cm-shade'),null);assert.equal(document.querySelectorAll('.cm-card').length,8);
await click(document.querySelector('.cm-card'));await wait();assert.equal(document.querySelector('.cm-inline-detail'),null);
await act(async()=>root.unmount());root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<TrangChuQuanTri token="admin"/>));await wait();assert.ok(document.querySelector('.tc-design-grid'));assert.ok(document.querySelector('.tc-preview'));assert.equal(document.querySelectorAll('.tc-design-grid>label').length,7);
await act(async()=>root.unmount());root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<VaiTroNhanVien token="admin" onChanged={async()=>{}}/>));await wait();assert.match(document.querySelector('.nv-roles')!.textContent!,/toàn hệ thống/);assert.ok(document.querySelector('.nv-role-list button'));
await act(async()=>root.unmount());
const {default:DonDatPhongMoi}=await import('../trang-web/src/DonDatPhong.tsx');
let openedThread:any;
root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<DonDatPhongMoi token="admin" onOpenChat={x=>{openedThread=x}}/>));await wait();
assert.equal(document.querySelector('.dp-code')?.getAttribute('title'),'DPKIEMTHU001');
await click(document.querySelector('[aria-label="Chat theo đơn"]'));await wait();
assert.ok(openedThread?.id);assert.equal(document.querySelector('.don-lich-dialog'),null);
await click(document.querySelector('[aria-label="Ảnh của đơn"]'));await wait();
assert.ok(document.querySelector('.ad-dialog'));assert.equal(document.querySelector('.don-lich-dialog'),null);
await click(document.querySelector('[aria-label="Đóng ảnh đơn"]'));await click(document.querySelector('.dp-code'));await wait();
assert.equal(document.querySelectorAll('.don-lifecycle button').length,4);
assert.equal(document.querySelector('.don-lifecycle button.don-action-checkin')?.hasAttribute('disabled'),false);
assert.equal(document.querySelector('.don-lifecycle button.don-action-off')?.hasAttribute('disabled'),true);
assert.match(document.querySelector('.don-lich-dialog dl')!.textContent!,/Nhận → Trả/);
await act(async()=>root.unmount());
const {default:ThietLapTrangThaiMoi,hienThiMacDinh}=await import('../trang-web/src/ThietLapTrangThai.tsx');
root=createRoot(document.getElementById('root')!);
await act(async()=>root.render(<ThietLapTrangThaiMoi token="admin" value={{...hienThiMacDinh,phien_ban:1}} onSaved={()=>{}}/>));await wait();
assert.equal(document.querySelectorAll('.lp-state-group').length,2);
await click(document.querySelectorAll('.lp-state-group header button')[1]);
assert.ok(document.querySelector('[aria-label="Tên trạng thái thanh_toan"]'));assert.equal(document.querySelector('[aria-label="Tên trạng thái phong"]'),null);
await act(async()=>root.unmount());
console.log('PASS UI đơn: icon chat/ảnh không mở chi tiết; nút vòng đời khóa đúng trạng thái; thiết lập hai danh mục độc lập.');
console.log('PASS UI Tổng quan/Báo cáo/Đánh giá: liên kết đúng mục và ngày; Combo mở chi tiết trải ngang dưới hàng; Trang chủ mở thêm 7 thiết lập; vai trò có màn hình cấp quyền.');
dom.window.close();
console.log(
  "PASS UI tiện ích: khách gọn/biểu tượng/ẩn mở lại, tự tải tin cũ giữ vị trí và chống lặp, gửi/xem tệp, tìm tin/ngữ cảnh, gửi mẫu ngay/biến thiếu/CRUD mẫu, chuông mở chi tiết đơn.",
);
process.exit(0);
