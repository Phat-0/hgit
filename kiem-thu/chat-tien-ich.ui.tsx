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
await click(document.querySelector(".chat-thread"));
await wait();
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
dom.window.close();
console.log(
  "PASS UI tiện ích: khách gọn/biểu tượng/ẩn mở lại, tự tải tin cũ giữ vị trí và chống lặp, gửi/xem tệp, tìm tin/ngữ cảnh, gửi mẫu ngay/biến thiếu/CRUD mẫu, chuông mở chi tiết đơn.",
);
process.exit(0);
