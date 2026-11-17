/** Private browser fixtures. All API requests are intercepted; this never writes production data. */
export async function duLieuPhongGia(page) {
  const photos = [
    "https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=1200",
    "https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=1200",
    "https://images.unsplash.com/photo-1613977257363-707ba9348227?w=1200",
  ];
  const ui = {
    ten_web: "HomeStay",
    khau_hieu: "Một khoảng riêng dành cho bạn",
    tieu_de_phong: "Phòng & không gian lưu trú",
    tieu_de_combo: "Combo ưu đãi đặc biệt",
    mau_nen: "#1e1813",
    mau_nhan: "#e9bd80",
    so_cot: 3,
    anh_ben_trai: false,
  };
  const home = {
    giao_dien: ui,
    hero: {
      hien: true,
      tieu_de: "Một chốn nghỉ. Nhiều cảm hứng.",
      noi_dung: "Chọn không gian để tận hưởng khoảng thời gian của riêng bạn.",
      anh: photos[0],
      album: photos.slice(1),
    },
    gioi_thieu: null,
    the: [],
    hien_phong: true,
    hien_combo: true,
    chan_trang: {
      hien: true,
      tieu_de: "HomeStay",
      noi_dung: "Đặt phòng theo giờ, ngày và đêm.",
      anh: "",
      dia_chi: "Địa chỉ kiểm thử",
      dien_thoai: "0901234567",
    },
  };
  const rooms = Array.from({ length: 15 }, (_, i) => ({
    id: "phong-" + i,
    homestay_id: i < 8 ? "branch" : "branch2",
    ten_phong:
      ["Deluxe Garden", "Suite Bathtub", "Romantic", "Family", "Studio Cinema"][
        i
      ] || "Phòng " + (i + 1),
    ma_phong: "P10" + i,
    ten_homestay: i < 8 ? "HomeStay trung tâm" : "HomeStay ven sông",
    dia_chi: "Địa chỉ kiểm thử",
    tinh_thanh: "TP. Hồ Chí Minh",
    ten_loai: "Phòng cao cấp",
    mo_ta: "Không gian riêng tư, ánh sáng tự nhiên và góc nghỉ ngơi ấm cúng.",
    suc_chua: i === 3 ? 4 : 2,
    dien_tich_m2: "28",
    tien_phong: 720000 + i * 80000,
    anh: [photos[i % 3], photos[(i + 1) % 3], photos[(i + 2) % 3]],
  }));
  rooms.forEach((p, i) =>
    Object.assign(p, {
      gia_moi_gio: 200000,
      gia_moi_dem: 500000,
      gia_phu_thu_gio: 50000,
      so_gio_toi_thieu: 2,
      cho_dat_theo_gio: true,
      cho_dat_theo_ngay: true,
      cho_dat_theo_dem: true,
      anh_chon: p.anh.map((url, j) => ({ id: "photo-" + i + "-" + j, url })),
    }),
  );
  home.hero.bo_anh = rooms
    .slice(0, 3)
    .map((p, i) => ({ phong_id: p.id, anh_id: "photo-" + i + "-0" }));
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path.endsWith("/gioi-thieu"))
        data = {
          thong_ke:{so_homestay:2,so_phong:15,luot_khach:30},
          phong: rooms.map((p) => ({ ...p, gia_moi_ngay: p.tien_phong })),
          combo: Array.from({ length: 3 }, (_, i) => ({
            id: "combo-" + i,
            ten_combo: ["Combo Lãng mạn", "Combo Thư giãn", "Combo Gia đình"][
              i
            ],
            mo_ta: "Gói dịch vụ cho kỳ nghỉ",
            gia_combo: 150000 + i * 50000,
            so_gio_bao_gom: null,
            pham_vi: "toan_he_thong",
            anh: [photos[i]],
          })),
          danh_gia: [
            {
              id: "review",
              so_sao: 5,
              noi_dung: "Phòng sạch, ảnh đúng thực tế và hỗ trợ nhanh.",
              ten_khach: "An · Khách lưu trú",
              ten_phong: "Deluxe Garden",
              ten_homestay: "HomeStay trung tâm",
              ngay_tao: new Date().toISOString(),
            },
          ],
          chi_nhanh: [
            {
              id: "branch",
              ten_homestay: "HomeStay trung tâm",
              dia_chi: "Địa chỉ kiểm thử",
              tinh_thanh: "TP. Hồ Chí Minh",
              vi_do: "10.7769",
              kinh_do: "106.7009",
            },
            {
              id: "branch2",
              ten_homestay: "HomeStay ven sông",
              dia_chi: "Địa chỉ kiểm thử thứ hai",
              tinh_thanh: "TP. Hồ Chí Minh",
              vi_do: "10.79",
              kinh_do: "106.72",
            },
          ],
        };
      else if (path.endsWith("/trang-chu")) data = home;
      else if (path.endsWith("/cau-hinh"))
        data = {
          chi_nhanh: [
            { id: "branch", ten_homestay: "HomeStay trung tâm" },
            { id: "branch2", ten_homestay: "HomeStay ven sông" },
          ],
          khung_gio: {
            gio_tu: "08:00",
            gio_den: "22:00",
            ngay_tu: "14:00",
            ngay_den: "12:00",
            dem_tu: "20:00",
            dem_den: "08:00",
          },
        };
      else if (path.endsWith("/phong")) data = rooms;
      else if (path.endsWith("/combo-noi-bat"))
        data = Array.from({ length: 3 }, (_, i) => ({
          id: "combo-" + i,
          ten_combo: ["Combo Lãng mạn", "Combo Thư giãn", "Combo Gia đình"][i],
          mo_ta: "Gói dịch vụ phù hợp cho thời gian nghỉ ngơi của bạn.",
          gia_combo: 150000,
          so_gio_bao_gom: null,
          pham_vi: "toan_he_thong",
          chi_nhanh_ids: [],
          phong_ids: [],
          anh: [photos[i]],
        }));
      else if (path.endsWith("/combo"))
        data = Array.from({ length: 3 }, (_, i) => ({
          id: "combo-" + i,
          ten_combo: ["Combo Lãng mạn", "Combo Thư giãn", "Combo Gia đình"][i],
          gia_combo: 150000 + i * 50000,
          so_gio_bao_gom: null,
          tong_gia: 870000 + i * 50000,
        }));
      else if (path.endsWith("/bao-gia")) {
        const q = route.request().postDataJSON();
        const room = rooms.find((p) => p.id === q.phong_id);
        data = {
          tien_phong:
            (q.hinh_thuc_dat === "Theo giờ"
              ? 200000
              : q.hinh_thuc_dat === "Theo đêm"
                ? 500000
                : room?.tien_phong || 720000) +
            (Array.isArray(q.combo_ids)?q.combo_ids.reduce((sum,id)=>sum+150000+Number(id.split("-")[1])*50000,0):q.combo_id?150000+Number(q.combo_id.split("-")[1])*50000:0) + Math.ceil((q.gio_nhan_som||0)+(q.gio_tra_muon||0))*50000,
          tien_phu_thu: Math.ceil((q.gio_nhan_som||0)+(q.gio_tra_muon||0))*50000,
        };
      } else if (path.endsWith("/chat/khach")) data = {};
      if (
        route.request().method() !== "GET" &&
        !path.endsWith("/bao-gia") &&
        !path.endsWith("/combo")
      )
        return route.fulfill({
          status: 403,
          json: { message: "Không ghi dữ liệu thật trong kiểm thử" },
        });
      return route.fulfill({ json: data });
    },
  );
}

export async function kiemTraPhongGia(page, base = "http://localhost:5173") {
  const check = (condition, message) => {
    if (!condition) throw Error(message);
  };
  await duLieuPhongGia(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/");
  await page.locator(".kh-cms-hero .kh-gallery-main").waitFor();
  check(
    (await page.locator(".kh-cms-hero .kh-gallery button").count()) === 0,
    "Đầu trang không có nút chuyển ảnh",
  );
  const drag = async (selector) => {
    const g = page.locator(selector),
      b = await g.boundingBox();
    await page.mouse.move(b.x + b.width * 0.8, b.y + 100);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width * 0.2, b.y + 100, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(280);
    check(
      (await g.getAttribute("aria-label")).startsWith("Ảnh 2"),
      "Kéo ảnh phải chuyển trang",
    );
    check(
      (await page.locator(".anh-phong-noi").count()) === 0,
      "Kéo không mở ảnh phóng to",
    );
  };
  await drag(".kh-cms-hero .kh-gallery-main");
  const results = [];
  for (const width of [360, 390, 768, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(base + "/phong-gia");
    await page.locator("#gioi-thieu-phong .kh-feature-card").first().waitFor();
    await page.getByLabel("Tìm phòng giới thiệu").fill("Family");
    check(
      (await page.locator("#gioi-thieu-phong .kh-feature-card").count()) === 1,
      "Lọc phòng theo tên",
    );
    await page.getByLabel("Tìm phòng giới thiệu").fill("");
    await page
      .locator("#gioi-thieu-phong .kh-feature-card button")
      .first()
      .click();
    await page.locator(".kh-room-page").waitFor();
    check(new URL(page.url()).pathname.startsWith("/phong/"),"Chi tiết có URL riêng");
    await drag(".kh-room-page .kh-gallery-main");
    check(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
      "Không tràn ngang ở " + width,
    );
    check(await page.locator(".kh-room-page-description").isVisible(),"Mô tả dưới ảnh và bảng giá");
    await page.locator(".kh-room-back").click();
    await page.locator("#gioi-thieu-phong").waitFor();
    results.push({ width, passed: true });
  }
  await page.goto(base + "/uu-dai-combo");
  await page.locator("#combo-khach .kh-feature-card").first().waitFor();
  check(
    !(await page.locator("#gioi-thieu-phong").isVisible()),
    "Trang combo không hiện danh sách phòng",
  );
  return results;
}

/** Supplemental checks for the homepage composition, explicit search and public content. */
export async function kiemTraTrangChuMoi(page, base = "http://localhost:5173") {
  await duLieuPhongGia(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/");
  await page.locator(".kh-feature-card").first().waitFor();
  const check = (ok, message) => {
    if (!ok) throw Error(message);
  };
  check(
    (await page.locator("#gioi-thieu-phong .kh-sort").count()) === 0,
    "Trang chủ chỉ lọc chi nhánh",
  );
  await page
    .getByLabel("Chi nhánh của phòng giới thiệu")
    .selectOption("branch2");
  const before = await page.locator("#gioi-thieu-phong h3").allTextContents();
  await page.locator(".kh-booking-toggle").click();
  await page.getByRole("button", { name: "Theo giờ", exact: true }).click();
  const receive = page.getByRole("spinbutton", { name: "Giờ nhận phòng" });
  check(
    (await receive.locator(".kh-wheel-number").count()) === 3,
    "Chỉ hiện ba mốc giờ",
  );
  const value = await receive.getAttribute("aria-valuetext");
  await receive.press("ArrowRight");
  check(
    (await receive.getAttribute("aria-valuetext")) !== value,
    "Kéo/điều khiển được giờ",
  );
  const bottoms = await page
    .locator(".kh-search form")
    .evaluate((e) =>
      Array.from(e.children).map((n) => n.getBoundingClientRect().bottom),
    );
  check(
    Math.max(...bottoms) - Math.min(...bottoms) < 2,
    "Các ô tìm phòng cùng một hàng",
  );
  await page.getByRole("button", { name: "Theo ngày", exact: true }).click();
  if (!(await page.locator("#kh-booking-panel").isVisible())) await page.locator(".kh-booking-toggle").click();
  await page.getByRole("button", { name: "Tìm phòng phù hợp ↗" }).click();
  await page.locator("#ket-qua-phong article").first().waitFor();
  check(
    (await page.locator("#ket-qua-phong article").count()) === 10,
    "Tối đa 10 phòng trong xem nhanh",
  );
  check(
    JSON.stringify(before) ===
      JSON.stringify(
        await page.locator("#gioi-thieu-phong h3").allTextContents(),
      ),
    "Giữ nguyên phòng giới thiệu bên dưới",
  );
  await page
    .getByRole("button", { name: /Xem tất cả 15 phòng theo chi nhánh/ })
    .click();
  await page.locator(".kh-results-full article").first().waitFor();
  check(
    (await page.locator(".kh-results-full article").count()) === 15,
    "Trang xem tất cả đủ dữ liệu",
  );
  check(
    (await page.locator(".kh-result-group>h3").count()) === 2,
    "Nhóm phòng theo chi nhánh",
  );
  check(
    (await page.locator(".kh-showcases,#dat-phong").count()) === 0,
    "Trang kết quả không trộn danh mục",
  );
  return {
    clockWheel: true,
    singleRow: true,
    tenRooms: true,
    catalogUnchanged: true,
    fullResults: true,
  };
}
export async function kiemTraDatPhongKhach(
  page,
  base = "http://localhost:5173",
) {
  await duLieuPhongGia(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  let requests = 0,
    body = null;
  await page.route("**/api/khach/dat-phong", async (route) => {
    requests++;
    body = route.request().postDataJSON();
    await new Promise((resolve) => setTimeout(resolve, 100));
    return route.fulfill({
      json: {
        ma_dat_phong: "UI-TEST-ORDER",
        tong_tien: 720000,
        trang_thai: "Chờ xác nhận",
        het_han_giu_cho: new Date(Date.now() + 900000).toISOString(),
      },
    });
  });
  const check = (ok, message) => {
    if (!ok) throw Error(message);
  };
  await page.goto(base + "/");
  await page
    .locator("#gioi-thieu-phong .kh-feature-card button")
    .first()
    .click();
  await page
    .getByRole("button", { name: "Đặt phòng này", exact: true })
    .click();
  check(
    (await page.locator(".kh-reserve-kind button[aria-pressed=true]").count()) === 0,
    "Ảnh giới thiệu không gán loại đặt",
  );
  check(
    !(await page.locator(".kh-reserve-notice").count()),
    "Không hiện cảnh báo khi chưa nhấn đặt",
  );
  await page.locator(".kh-reserve-kind").getByRole("button",{name:"Theo ngày",exact:true}).click();
  await page
    .locator(".kh-reserve-total strong")
    .filter({ hasText: "720.000" })
    .waitFor();
  await page
    .getByLabel("Tên khách hàng", { exact: true })
    .fill("Khách kiểm thử");
  await page.getByLabel("Số điện thoại", { exact: true }).fill("0901234567");
  await page.locator(".kh-reserve form").evaluate((form) => {
    form.requestSubmit();
    form.requestSubmit();
  });
  await page.locator(".kh-reserve-notice").waitFor();
  check(requests === 0,"Chưa ghi đơn khi chỉ mở cảnh báo");
  await page.getByRole("button",{name:"Tiếp tục đặt không đăng nhập"}).dblclick();
  await page.locator(".kh-receipt").waitFor();
  check(requests === 1, "Không gửi trùng đơn");
  check(
    body.hinh_thuc_dat === "Theo ngày" &&
      !!body.khoa_yeu_cau &&
      !Object.hasOwn(body, "tien_phong"),
    "Gửi lịch/loại đúng, máy chủ tự tính giá",
  );
  await page.getByRole("button", { name: "Đóng", exact: true }).click();
  await page.goto(base + "/");
  if (!(await page.locator("#kh-booking-panel").isVisible())) await page.locator(".kh-booking-toggle").click();
  await page.getByRole("button", { name: "Tìm phòng phù hợp ↗" }).click();
  await page.locator("#ket-qua-phong article").first().waitFor();
  await page.locator("#ket-qua-phong article button").first().click();
  await page
    .getByRole("button", { name: "Đặt phòng này", exact: true })
    .click();
  check(
    (await page.locator(".kh-reserve-kind button[aria-pressed=true]").innerText()) === "Theo ngày",
    "Kết quả tìm kiếm mang theo loại đặt",
  );
  await page.getByRole("button", { name: "Đóng đặt phòng" }).click();
  return {
    unseeded: true,
    warning: true,
    autoQuote: true,
    idempotent: true,
    serverPrice: true,
    seededSearch: true,
  };
}
export async function kiemTraAnhVaBanDo(page, base = "http://localhost:5173") {
  await duLieuPhongGia(page);
  await page.context().grantPermissions(["geolocation"], { origin: base });
  await page.context().setGeolocation({ latitude: 10.77, longitude: 106.69 });
  await page.route("https://router.project-osrm.org/table/**", (r) =>
    r.fulfill({ json: { code: "Ok", distances: [[0, 1200, 2500]] } }),
  );
  await page.route("https://router.project-osrm.org/route/**", (r) =>
    r.fulfill({
      json: {
        code: "Ok",
        routes: [
          {
            distance: 2500,
            duration: 480,
            geometry: {
              coordinates: [
                [106.69, 10.77],
                [106.72, 10.79],
              ],
            },
          },
        ],
      },
    }),
  );
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/");
  await page.locator(".kh-gallery-fan").waitFor();
  const check = (ok, message) => {
    if (!ok) throw Error(message);
  };
  check(
    !(await page.locator(".kh-gallery--noi .kh-gallery-caption").isVisible()),
    "Ảnh đầu trang không chú thích",
  );
  const boxes = await page
    .locator(".kh-cms-hero>div")
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().x));
  check(boxes[0] < boxes[1], "Chữ và ảnh xếp hai bên");
  check(await page.locator(".kh-footer-map select").count() === 0, "Ngoài footer chỉ có bản đồ");
  await page.getByRole("button", {name:"Mở bản đồ chi nhánh",exact:true}).click();
  check(await page.locator(".kh-map-layout aside>.kh-map-group").count()===3,"Sidebar đúng ba nhóm");
  await page.getByRole("button", {name:"Cho phép tìm vị trí hiện tại",exact:true}).click();
  await page.locator(".kh-map-distances li strong").filter({hasText:"1,2 km"}).waitFor();
  await page.getByRole("button",{name:"Dẫn đường →",exact:true}).click();
  await page.locator(".kh-route-summary").waitFor();
  check(
    (await page.locator(".kh-route-summary").innerText()).includes("2,5 km"),
    "Đường đi từ vị trí hiện tại",
  );
  await page.keyboard.press("Escape");
  return {
    splitHero: true,
    noCaption: true,
    branchRequired: true,
    distances: true,
    directions: true,
  };
}

export async function kiemTraNhieuCombo(page,base='http://localhost:5173'){
 await duLieuPhongGia(page);let writes=0,body;
 await page.route('**/api/khach/dat-phong',async r=>{writes++;body=r.request().postDataJSON();await r.fulfill({json:{ma_dat_phong:'UI-BUNDLE',tong_tien:1070000,trang_thai:'Chờ xác nhận',het_han_giu_cho:new Date(Date.now()+900000).toISOString()}});});
 const check=(v,m)=>{if(!v)throw Error(m);};
 await page.goto(base+'/phong/phong-0');await page.getByRole('button',{name:'Đặt phòng này',exact:true}).click();
 await page.locator('.kh-reserve-kind').getByRole('button',{name:'Theo ngày',exact:true}).click();await page.locator('.kh-reserve-total strong').filter({hasText:'720.000'}).waitFor();
 await page.locator('.kh-reserve-combo-toolbar button').click();await page.locator('.kh-reserve-combo-list button').nth(0).click();await page.locator('.kh-reserve-combo-list button').nth(1).click();
 await page.locator('.kh-reserve-total strong').filter({hasText:'1.070.000'}).waitFor();check(await page.locator('.kh-reserve-selected-combos>div').count()===2,'Hai combo trong tóm tắt');
 check((await page.locator('.kh-reserve-combo-toolbar button').innerText()).includes('(2)'),'Số combo đã chọn');check(!await page.locator('.kh-reserve-form-fields').isVisible(),'Chuyển sang danh sách combo');
 await page.getByRole('button',{name:'Tiếp tục thông tin đặt phòng',exact:true}).click();await page.getByLabel('Tên khách hàng',{exact:true}).fill('Khách chọn combo');await page.getByLabel('Số điện thoại',{exact:true}).fill('0901234567');
 check(await page.locator('.kh-reserve-notice').count()===0,'Chưa hiện cảnh báo trước khi gửi');await page.locator('.kh-reserve-submit').click();await page.locator('.kh-reserve-notice').waitFor();
 check((await page.locator('.kh-reserve-notice').innerText()).includes('đăng nhập hoặc đăng ký để xác nhận đơn thêm lần nữa'),'Nhắc xác nhận bằng tài khoản');check(writes===0,'Không ghi đơn khi mới hiện cảnh báo');
 await page.getByRole('button',{name:'Tiếp tục đặt không đăng nhập',exact:true}).click();await page.locator('.kh-receipt').waitFor();check(writes===1&&body.combo_ids.length===2,'Gửi đúng danh sách combo một lần');
 return {selected:2,total:1070000,warningOnSubmit:true,oneWrite:true};
}
