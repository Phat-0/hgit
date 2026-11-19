import { duLieuPhongGia } from "./khach-phong-gia.playwright.mjs";
export async function kiemTraGonDatPhongBanDo(page) {
  await page.unrouteAll({ behavior: "wait" });
  await duLieuPhongGia(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("http://localhost:5173/");
  await page.locator(".kh-feature-card").first().waitFor({ state: "attached" });
  await page.waitForTimeout(1900);
  const groups = await page
    .locator("[data-scroll-reveal],[data-motion-wait]")
    .count();
  if (groups > 25) throw Error("Quá nhiều phần tử chuyển động " + groups);
  if (await page.locator(".kh-motion-choice").count())
    throw Error("Còn nút hiệu ứng");
  await page.locator(".kh-booking-toggle").scrollIntoViewIfNeeded();
  const next = page.locator(".kh-showcases-home"),
    top = () => next.evaluate((e) => e.getBoundingClientRect().top + scrollY);
  const before = await top();
  await page.locator(".kh-booking-toggle").click();
  await page.waitForTimeout(500);
  const middle = await top();
  await page.waitForTimeout(1400);
  const after = await top();
  if (!(middle > before + 10 && middle < after - 10))
    throw Error(
      "Khối dưới không đi cùng " + JSON.stringify({ before, middle, after }),
    );
  await page.locator(".kh-booking-toggle").click();
  await page.waitForTimeout(500);
  const closeMiddle = await top();
  await page.waitForTimeout(1400);
  const closed = await top();
  if (!(closeMiddle < after - 10 && closeMiddle > closed + 10))
    throw Error("Đóng bị nhảy");
  await page.locator(".kh-cms-hero .kh-gallery-main").click();
  const light = page.getByRole("dialog", {
    name: "Xem ảnh phòng hoặc combo",
    exact: true,
  });
  await light.waitFor();
  await page.waitForTimeout(450);
  const buttons = await light.locator(":scope>button").evaluateAll((es) =>
    es.map((e) => {
      const r = e.getBoundingClientRect();
      return {
        x: r.x,
        y: r.y,
        w: r.width,
        h: r.height,
        label: e.getAttribute("aria-label"),
      };
    }),
  );
  for (const b of buttons)
    if (b.x < 0 || b.y < 0 || b.x + b.w > 1441 || b.y + b.h > 951)
      throw Error("Nút ảnh lệch");
  await light.getByRole("button", { name: "Đóng ảnh", exact: true }).click();
  await light.waitFor({ state: "hidden" });
  await page
    .locator(".kh-nav")
    .getByRole("link", { name: "Phòng & Giá", exact: true })
    .click();
  await page.locator(".kh-feature-card").first().getByRole("button").click();
  await page
    .getByRole("button", { name: "Đặt phòng này", exact: true })
    .click();
  const reserve = page.locator(".kh-reserve");
  await reserve.getByRole("button", { name: "Theo ngày", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".kh-reserve-total strong")
      ?.textContent?.includes("₫"),
  );
  const priceBefore = await page
    .locator(".kh-reserve-total strong")
    .innerText();
  const wheel = page.getByRole("spinbutton", {
    name: "Check-in sớm",
    exact: true,
  });
  await wheel.focus();
  await page.keyboard.press("ArrowRight");
  const immediate = await page.locator(".kh-reserve-total strong").innerText();
  if (immediate === priceBefore) throw Error("Giá chưa cập nhật ngay");
  if (await reserve.getByText("Đang tính giá…", { exact: true }).count())
    throw Error("Còn chữ đang tính");
  await page.waitForTimeout(500);
  const layouts = [];
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 950 });
    const m = await reserve.evaluate((e) => ({
      width: innerWidth,
      height: e.getBoundingClientRect().height,
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 1,
      inner: [
        ...e.querySelectorAll(".kh-reserve-fields,.kh-reserve-summary"),
      ].map((n) => getComputedStyle(n).overflowY),
    }));
    if (m.pageOverflow || m.inner.some((x) => x === "auto" || x === "scroll"))
      throw Error("Form tràn/cuộn trong " + JSON.stringify(m));
    layouts.push(m);
  }
  await page
    .getByRole("button", { name: "Đóng đặt phòng", exact: true })
    .click();
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.locator(".kh-map-preview button").click();
  const map = page.getByRole("dialog", {
    name: "Bản đồ và đường đi",
    exact: true,
  });
  await map.waitFor();
  if (await map.locator("header").count()) throw Error("Còn tiêu đề bản đồ");
  await map
    .getByRole("checkbox", { name: "Tất cả chi nhánh", exact: true })
    .uncheck();
  await map
    .getByRole("checkbox", { name: "Tất cả chi nhánh", exact: true })
    .check();
  if (await map.locator(".kh-map-distances li").count())
    throw Error("Chưa cho vị trí đã có khoảng cách");
  await map
    .getByText(
      "Cho phép truy cập vị trí để xem khoảng cách đến từng chi nhánh.",
      { exact: true },
    )
    .waitFor();
  await page
    .context()
    .grantPermissions(["geolocation"], { origin: "http://localhost:5173" });
  await page.context().setGeolocation({ latitude: 10.7769, longitude: 106.7 });
  await map
    .getByRole("button", { name: "Cho phép tìm vị trí hiện tại", exact: true })
    .click();
  await map.locator(".kh-map-distances li").first().waitFor();
  const distances = await map.locator(".kh-map-distances li").count();
  await map.getByRole("button", { name: "Dẫn đường →", exact: true }).click();
  await map
    .getByLabel("Chi nhánh dẫn đường", { exact: true })
    .selectOption({ index: 1 });
  await map
    .getByRole("link", { name: "Mở ứng dụng bản đồ ↗", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Đóng bản đồ", exact: true }).click();
  await page.context().clearPermissions();
  await page.emulateMedia({ reducedMotion: null });
  await page.goto("about:blank");
  await page.unrouteAll({ behavior: "wait" });
  return {
    groups,
    fold: { before, middle, after, closeMiddle, closed },
    buttons,
    price: { priceBefore, immediate },
    layouts,
    distances,
  };
}
