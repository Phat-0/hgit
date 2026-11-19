import { duLieuPhongGia } from "./khach-phong-gia.playwright.mjs";
export async function kiemTraCuonTrangChu(page) {
  await page.unrouteAll({ behavior: "wait" });
  await duLieuPhongGia(page);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 950 });
  let docs = 0,
    common = 0;
  const onReq = (r) => {
    if (r.isNavigationRequest() && r.frame() === page.mainFrame()) docs++;
    if (/\/api\/khach\/(trang-chu|gioi-thieu|cau-hinh)$/.test(r.url()))
      common++;
  };
  page.on("request", onReq);
  await page.goto("http://localhost:5173/");
  await page.locator(".kh-feature-card").first().waitFor({ state: "attached" });
  const marker = await page.evaluate(() => {
    window.__khNavTest = Math.random();
    return window.__khNavTest;
  });
  const native = await page.evaluate(() => ({
    supported: CSS.supports("animation-timeline:view()"),
    elements: document.querySelectorAll("[data-scroll-reveal]").length,
  }));
  if (native.supported && native.elements < 12) throw Error("Thiếu timeline");
  const firstCard = page.locator(".kh-feature-card").first();
  await firstCard.scrollIntoViewIfNeeded();
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  if (
    (await firstCard.evaluate((e) => Number(getComputedStyle(e).opacity))) <
    0.95
  )
    throw Error("Timeline chưa hiện đủ khi cuộn tới");
  const requestsBefore = common;
  await page
    .locator(".kh-nav")
    .getByRole("link", { name: "Phòng & Giá", exact: true })
    .click();
  await page.waitForURL("**/phong-gia");
  await page.locator(".kh-feature-card").first().waitFor();
  await page
    .locator(".kh-nav")
    .getByRole("link", { name: "Ưu đãi Combo", exact: true })
    .click();
  await page.waitForURL("**/uu-dai-combo");
  await page
    .locator(".kh-nav")
    .getByRole("link", { name: "Trang chủ", exact: true })
    .click();
  await page.waitForURL("http://localhost:5173/");
  if (
    (await page.evaluate(() => window.__khNavTest)) !== marker ||
    common !== requestsBefore
  )
    throw Error("Tải lại trang/dữ liệu chung khi chuyển trang");
  await page.goBack();
  await page.waitForURL("**/uu-dai-combo");
  await page.goForward();
  await page.waitForURL("http://localhost:5173/");
  await page.locator(".kh-booking-toggle").scrollIntoViewIfNeeded();
  await page.locator(".kh-booking-toggle").click();
  await page.locator(".kh-booking-content select").first().waitFor();
  await page.waitForTimeout(1100);
  const split = await page
    .locator(".kh-booking-panel")
    .evaluate((e) => ({
      columns: getComputedStyle(e).gridTemplateColumns,
      height: e.getBoundingClientRect().height,
      opacity: getComputedStyle(e).opacity,
    }));
  if (split.opacity !== "1") throw Error("Khung chưa hiện đủ");
  const layouts = [];
  for (const width of [1440, 1024, 768, 390, 360]) {
    await page.setViewportSize({ width, height: 950 });
    const measure = await page.evaluate(() => {
      const f = document.querySelector(".kh-footer-designed"),
        p = document.querySelector(".kh-booking-panel");
      return {
        width: innerWidth,
        overflow: document.documentElement.scrollWidth > innerWidth + 1,
        footerHeight: Math.round(f.getBoundingClientRect().height),
        panelOverflow: p.scrollWidth > p.clientWidth + 1,
      };
    });
    if (measure.overflow || measure.panelOverflow)
      throw Error("Tràn " + JSON.stringify(measure));
    layouts.push(measure);
  }
  await page.locator(".kh-booking-toggle").click();
  await page.waitForFunction(
    () => document.querySelector("#kh-booking-panel")?.hidden === true,
  );
  await page.locator(".kh-booking-toggle").click();
  await page.waitForTimeout(1100);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.locator(".kh-feature-card").first().waitFor({ state: "attached" });
  const visible = await page
    .locator(".kh-feature-card")
    .first()
    .evaluate((e) => getComputedStyle(e).opacity);
  if (visible !== "1") throw Error("Mất nội dung khi giảm chuyển động");
  page.off("request", onReq);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("about:blank");
  await page.unrouteAll({ behavior: "wait" });
  return {
    native,
    docs,
    requestsBefore,
    common,
    split,
    layouts,
    reduced: visible,
  };
}
export async function kiemTraThietLapTrangChu(page) {
  await page.unrouteAll({ behavior: "wait" });
  await duLieuGiaoDien(page);
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("http://localhost:5173/quan-tri");
  await page.locator(".qt-nav-item").filter({ hasText: "Trang chủ" }).click();
  await page.getByText("00 · Thương hiệu và nền", { exact: true }).waitFor();
  if (
    (await page.getByText("Số thẻ mỗi hàng", { exact: true }).count()) ||
    (await page.getByText("Vị trí ảnh nổi", { exact: true }).count()) > 1
  )
    throw Error("Còn thiết lập thừa");
  await page.getByText("Màu nền tối bên dưới", { exact: true }).waitFor();
  await page
    .getByText("Hiệu ứng theo cuộn (Scroll-Driven)", { exact: true })
    .waitFor();
  await page.getByText("Tốc độ mở đặt đơn (ms)", { exact: true }).waitFor();
  const review = page.locator(".tc-review-settings");
  await review.getByRole("textbox").fill("Khách kể về kỳ nghỉ");
  const layouts = [];
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 950 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    if (overflow) throw Error("Quản trị tràn " + width);
    layouts.push({ width, overflow });
  }
  await page.getByRole("button", { name: "Lưu nháp", exact: true }).click();
  await page
    .getByText("Đã lưu nháp. Trang khách vẫn giữ bản đã xuất bản.", {
      exact: true,
    })
    .waitFor();
  await page.goto("about:blank");
  await page.unrouteAll({ behavior: "wait" });
  return { reviewEditable: true, layouts };
}
