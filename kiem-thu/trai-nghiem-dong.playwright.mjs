import { duLieuPhongGia } from "./khach-phong-gia.playwright.mjs";
export async function kiemTraTraiNghiemDong(page) {
  await page.unrouteAll({ behavior: "wait" });
  await duLieuPhongGia(page, { reviewCount: 8 });
  const support = "77777777-7777-4777-8777-777777777777";
  await page.route(
    (u) => u.pathname.startsWith("/api/khach/chat"),
    async (r) => {
      const p = new URL(r.request().url()).pathname;
      let json = { ok: true };
      if (p.endsWith("/chat"))
        json =
          r.request().method() === "POST"
            ? { id: support, guest_token: "fixture-motion-guest" }
            : {
                hoi_thoai: [
                  {
                    id: support,
                    ten_hien_thi: "CSKH HomeStay",
                    loai: "ho_tro",
                    chua_doc: 0,
                  },
                ],
                tong_so: 1,
                tong_chua_doc: 0,
              };
      else if (p.endsWith("/tin-nhan"))
        json = {
          toi: "guest",
          tin_nhan: [],
          co_tin_cu: false,
          duoc_dung_mau: false,
        };
      await r.fulfill({ json });
    },
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1440, height: 950 });
  await page.goto("http://localhost:5173/");
  await page.locator(".kh-cms-hero .kh-gallery").waitFor({ state: "attached" });
  await page.waitForTimeout(200);
  const headline = await page
    .locator(".kh-headline-mask>span")
    .first()
    .evaluate((e) => ({
      name: getComputedStyle(e).animationName,
      playing: e.getAnimations().length,
    }));
  await page.waitForTimeout(1800);
  const hero = page.locator(".kh-cms-hero");
  const h0 = await hero.evaluate(
    (e) => getComputedStyle(e, "::before").transform,
  );
  await page.evaluate(() => scrollTo(0, 240));
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const h1 = await hero.evaluate(
    (e) => getComputedStyle(e, "::before").transform,
  );
  if (h0 !== h1) throw Error("Nền hero đổi khi cuộn");
  await page.evaluate(() => scrollTo(0, 0));
  await page.mouse.move(1000, 400);
  await page.waitForTimeout(220);
  const pointer = await page
    .locator(".kh-cms-hero>.kh-gallery")
    .evaluate((e) => getComputedStyle(e).translate);
  if (pointer === "0px" || pointer === "none")
    throw Error("Mouse không di chuyển ảnh");
  const gallery = page.locator(".kh-gallery-main").first();
  await gallery.click();
  const lightbox = page.getByRole("dialog", {
    name: "Xem ảnh phòng hoặc combo",
    exact: true,
  });
  await lightbox.waitFor();
  const openAnim = await lightbox.evaluate(
    (e) => getComputedStyle(e).animationName,
  );
  const old = await lightbox.locator("figure img").getAttribute("src");
  await lightbox.getByRole("button", { name: "Ảnh tiếp", exact: true }).click();
  const next = await lightbox.locator("figure img").getAttribute("src");
  if (next === old) throw Error("Lightbox không đổi ảnh");
  const nextAnim = await lightbox
    .locator("figure img")
    .evaluate((e) => getComputedStyle(e).animationName);
  await page.keyboard.press("ArrowLeft");
  await lightbox.getByRole("button", { name: "Đóng ảnh", exact: true }).click();
  await lightbox.waitFor({ state: "hidden" });
  const card = page.locator("#gioi-thieu-phong .kh-feature-card").first();
  await card.scrollIntoViewIfNeeded();
  await page.waitForTimeout(100);
  const reveal = await card.evaluate((node) => {const e=node.closest(".kh-showcase-cards");return ({
    playing: e.getAnimations().length,
    opacity: getComputedStyle(e).opacity,
  });});
  if (!reveal.playing) throw Error("Card không reveal");
  const stagger = await page
    .locator("#gioi-thieu-phong .kh-feature-card")
    .evaluateAll((es) =>
      es.slice(0, 3).map((e) => e.style.getPropertyValue("--motion-delay")),
    );
  await page.waitForTimeout(2100);
  const photo = card.locator("img");
  const p0 = await photo.evaluate((e) => getComputedStyle(e).translate);
  await page.evaluate(() => scrollBy(0, 80));
  await page.evaluate(
    () =>
      new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r))),
  );
  const p1 = await photo.evaluate((e) => getComputedStyle(e).translate);
  if (p0 === p1) throw Error("Ảnh phòng không parallax");
  await card.hover();
  await page.waitForTimeout(550);
  const hoverScale = await photo.evaluate((e) => getComputedStyle(e).scale);
  await page.getByRole("tab", { name: "Combo", exact: true }).click();
  await page.waitForTimeout(50);
  const tab = await page
    .locator("#combo-khach .kh-tab-content")
    .evaluate((e) => ({
      name: getComputedStyle(e).animationName,
      playing: e.getAnimations().length,
    }));
  if (!tab.playing) throw Error("Tab không transition");
  await page.locator(".kh-booking-toggle").click();
  await page.waitForTimeout(1800);
  if (await page.locator(".kh-booking-side").count())
    throw Error("Còn chữ Đặt đơn phụ");
  const indicator = page.locator(".kh-kind-indicator");
  await page.getByRole("button", { name: "Theo giờ", exact: true }).click();
  await page.waitForTimeout(500);
  const i0 = await indicator.evaluate((e) => getComputedStyle(e).transform);
  await page.getByRole("button", { name: "Qua đêm", exact: true }).click();
  await page.waitForTimeout(500);
  const i1 = await indicator.evaluate((e) => getComputedStyle(e).transform);
  if (i0 === i1) throw Error("Indicator không trượt");
  const track = page.locator(".kh-review-track");
  await track.scrollIntoViewIfNeeded();
  await page.mouse.move(5, 5);
  const r0 = await track.evaluate((e) => e.scrollLeft);
  await page.waitForFunction(
    (start) => {
      const e = document.querySelector(".kh-review-track");
      return e && e.scrollLeft > start + 20;
    },
    r0,
    { timeout: 6500 },
  );
  await page.waitForTimeout(800);
  await track.hover();
  const pause0 = await track.evaluate((e) => e.scrollLeft);
  await page.waitForTimeout(4700);
  const pause1 = await track.evaluate((e) => e.scrollLeft);
  if (Math.abs(pause0 - pause1) > 2) throw Error("Hover chưa dừng autoplay");
  const box = await track.boundingBox();
  await page.mouse.move(box.x + box.width * 0.7, box.y + 70);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.4, box.y + 70, { steps: 8 });
  await page.mouse.up();
  const drag = await track.evaluate((e) => e.scrollLeft);
  if (Math.abs(drag - pause1) < 10) throw Error("Review không kéo được");
  await page.locator(".chat-launch").click();
  await page.locator(".chat-window").waitFor();
  const chat = await page
    .locator(".chat-window")
    .evaluate((e) => ({
      name: getComputedStyle(e).animationName,
      playing: e.getAnimations().length,
    }));
  await page.getByRole("button", { name: "Chọn ảnh", exact: true }).waitFor();
  await page.getByRole("button", { name: "Chọn tệp", exact: true }).waitFor();
  if (chat.name !== "chat-customer-open") throw Error("Chat không scale fade");
  await page.locator(".kh-footer-designed").scrollIntoViewIfNeeded();
  await page.waitForTimeout(1800);
  const footer = await page
    .locator(
      ".kh-footer-location,.kh-footer-story,.kh-footer-explore,.kh-footer-connect",
    )
    .evaluateAll((es) =>
      es.map((e) => ({
        delay: e.style.getPropertyValue("--motion-delay"),
        opacity: getComputedStyle(e).opacity,
      })),
    );
  const layouts = [];
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 950 });
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > innerWidth + 1,
    );
    if (overflow) throw Error("Tràn " + width);
    layouts.push({ width, overflow });
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  await page.locator(".kh-cms-hero").waitFor();
  const reduced = await page
    .locator(".kh-headline-mask>span")
    .first()
    .evaluate((e) => getComputedStyle(e).animationName);
  if (reduced === "none") throw Error("Hiệu ứng bị tắt");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto("about:blank");
  await page.unrouteAll({ behavior: "wait" });
  return {
    headline,
    hero: { h0, h1, pointer },
    lightbox: { openAnim, nextAnim, changed: next !== old },
    reveal,
    stagger,
    photo: { p0, p1, hoverScale },
    tab,
    indicator: { i0, i1 },
    review: { r0, pause0, pause1, drag },
    chat,
    footer,
    layouts,
    reduced,
  };
}
export async function kiemTraFallbackCuon(page){
 await page.unrouteAll({behavior:'wait'});await duLieuPhongGia(page);await page.emulateMedia({reducedMotion:'no-preference'});await page.goto('http://localhost:5173/phong-gia');await page.locator('.kh-feature-card').first().waitFor();await page.evaluate(()=>{window.__motionSupports=CSS.supports.bind(CSS);CSS.supports=(...args)=>args[0].includes('animation-timeline')?false:window.__motionSupports(...args);});await page.locator('.kh-nav').getByRole('link',{name:'Trang chủ',exact:true}).click();await page.locator('[data-motion-wait]').first().waitFor({state:'attached'});const fallback=await page.locator('[data-motion-wait]').count();await page.locator('#gioi-thieu-phong .kh-feature-card').first().scrollIntoViewIfNeeded();await page.waitForTimeout(100);const playing=await page.locator('#gioi-thieu-phong .kh-showcase-cards').evaluate(e=>e.getAnimations().length);await page.evaluate(()=>{CSS.supports=window.__motionSupports;});if(!fallback||!playing)throw Error('Fallback không chạy');await page.goto('about:blank');await page.unrouteAll({behavior:'wait'});return{fallback,playing};
}
