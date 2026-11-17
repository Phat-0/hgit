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
  const rooms = Array.from({ length: 5 }, (_, i) => ({
    id: "phong-" + i,
    homestay_id: "branch",
    ten_phong: [
      "Deluxe Garden",
      "Suite Bathtub",
      "Romantic",
      "Family",
      "Studio Cinema",
    ][i],
    ma_phong: "P10" + i,
    ten_homestay: "HomeStay trung tâm",
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
      else if (path.endsWith("/bao-gia")) data = { tong_tien: 720000 };
      else if (path.endsWith("/chat/khach")) data = {};
      if (route.request().method() !== "GET" && !path.endsWith("/bao-gia"))
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
    await page.getByRole("dialog").waitFor();
    await drag(".kh-detail .kh-gallery-main");
    check(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
      "Không tràn ngang ở " + width,
    );
    await page.keyboard.press("Escape");
    check(
      (await page.getByRole("dialog").count()) === 0,
      "Escape đóng chi tiết",
    );
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
    !/Đăng nhập|Tham gia/.test(
      await page.locator("#kh-navigation").innerText(),
    ),
    "Header không có đăng nhập/tham gia",
  );
  check(
    !(await page.locator("#ket-qua-phong").isVisible()),
    "Kết quả chỉ hiện sau khi kiểm tra",
  );
  check(
    (await page
      .getByRole("tab", { name: "Giá phòng", exact: true })
      .getAttribute("aria-selected")) === "true",
    "Mặc định tab giá phòng",
  );
  await page.getByRole("tab", { name: "Combo", exact: true }).click();
  check(
    (await page.locator("#combo-khach").isVisible()) &&
      !(await page.locator("#gioi-thieu-phong").isVisible()),
    "Tab chỉ hiện dữ liệu đã chọn",
  );
  await page.getByLabel("Sắp xếp combo giới thiệu").selectOption("gia-giam");
  check(
    (await page.locator("#combo-khach h3").first().innerText()) ===
      "Combo Gia đình",
    "Sắp xếp giá combo",
  );
  await page.locator("#combo-khach .kh-feature-card button").first().click();
  check(
    (await page.getByRole("dialog").innerText()).includes("Giá combo"),
    "Chi tiết combo có giá",
  );
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Theo giờ", exact: true }).click();
  const radio = page.getByRole("radiogroup", { name: "Giờ nhận phòng" });
  check((await radio.getByRole("radio").count()) > 0, "Dải chọn giờ");
  check(
    (await radio.getByRole("radio").allTextContents()).every((t) =>
      /^[0-2][0-9]:(00|30)/.test(t),
    ),
    "Các mốc 30 phút",
  );
  await page.getByRole("button", { name: "Tìm phòng phù hợp ↗" }).click();
  await page.locator("#ket-qua-phong .kh-room-card").first().waitFor();
  check(
    (await page.locator(".kh-showcases .kh-feature-card").count()) === 6,
    "Kết quả phòng trống không thay danh mục",
  );
  return {
    tabs: true,
    comboDetail: true,
    hourStrip: true,
    separateResults: true,
  };
}

export async function kiemTraAnhVaBanDo(page, base = "http://localhost:5173") {
  await duLieuPhongGia(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto(base + "/");
  await page.locator(".kh-gallery-fan").waitFor();
  const check = (ok, message) => {
    if (!ok) throw Error(message);
  };
  check(
    await page
      .locator(".kh-cms-hero>div")
      .first()
      .evaluate((e) => getComputedStyle(e).textAlign === "center"),
    "Chữ đầu trang căn giữa",
  );
  const g = page.locator(".kh-cms-hero .kh-gallery-main"),
    box = await g.boundingBox(),
    next = page.locator(".kh-gallery-fan img").nth(2),
    before = Number(await next.evaluate((e) => getComputedStyle(e).zIndex));
  await page.mouse.move(box.x + box.width * 0.75, box.y + 100);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.35, box.y + 100, { steps: 10 });
  check(
    Number(await next.evaluate((e) => getComputedStyle(e).zIndex)) > before,
    "Ảnh kế nổi dần khi kéo",
  );
  await page.mouse.up();
  await page.waitForTimeout(300);
  await g.click();
  await page.getByRole("button", { name: "Xem thông tin phòng" }).click();
  check(
    (await page.getByRole("dialog").innerText()).includes(
      "Phụ thu giờ tiếp theo",
    ),
    "Ảnh mở chi tiết và giá phụ thu",
  );
  await page.keyboard.press("Escape");
  await page.route("https://router.project-osrm.org/**", (route) =>
    route.fulfill({
      json: {
        code: "Ok",
        routes: [
          {
            distance: 2500,
            duration: 480,
            geometry: {
              coordinates: [
                [106.69, 10.77],
                [106.7, 10.78],
                [106.72, 10.79],
              ],
            },
          },
        ],
      },
    }),
  );
  await page.locator("#dat-phong select").selectOption("branch2");
  await page.getByRole("button", { name: "Mở bản đồ và đường đi" }).click();
  check(
    (await page.locator(".kh-map-expanded .leaflet-interactive").count()) === 1,
    "Ghim bản đồ theo chi nhánh đã chọn",
  );
  await page
    .getByRole("dialog", { name: "Bản đồ và đường đi" })
    .locator("input[type=checkbox]")
    .first()
    .check();
  check(
    (await page.locator(".kh-map-expanded .leaflet-interactive").count()) === 2,
    "Hiện nhiều chi nhánh",
  );
  await page
    .locator(".kh-map-expanded")
    .click({ position: { x: 100, y: 100 } });
  await page.locator(".kh-route-summary").waitFor();
  check(
    (await page.locator(".kh-route-summary").innerText()).includes("2,5 km"),
    "Hiện khoảng cách và đường đi từ dữ liệu tuyến đường",
  );
  await page.keyboard.press("Escape");
  return {
    centeredHero: true,
    risingPhoto: true,
    photoToRoom: true,
    prices: true,
    branchSync: true,
    multiplePins: true,
    route: true,
  };
}
