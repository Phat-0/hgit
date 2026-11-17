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
  await page.route(
    (url) => url.pathname.startsWith("/api/"),
    async (route) => {
      const path = new URL(route.request().url()).pathname;
      let data = [];
      if (path.endsWith("/trang-chu")) data = home;
      else if (path.endsWith("/cau-hinh"))
        data = {
          chi_nhanh: [{ id: "branch", ten_homestay: "HomeStay trung tâm" }],
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
    await page.locator(".kh-room-card").first().waitFor();
    await page.locator(".kh-room-filters input").fill("Family");
    check(
      (await page.locator(".kh-room-card").count()) === 1,
      "Lọc phòng theo tên",
    );
    await page.locator(".kh-room-filters input").fill("");
    await page.locator(".kh-room-photo").first().click();
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
  await page.locator(".kh-combo-card").first().waitFor();
  check(
    !(await page.locator("#phong-khach").isVisible()),
    "Trang combo không hiện danh sách phòng",
  );
  return results;
}
