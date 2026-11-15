/** Run with an isolated Playwright Page already showing the Thống kê tab.
 * Only fixture GET responses and in-memory UI selection; never writes business data.
 */
export async function kiemTraLuaChonNoi(page) {
  const viewport = page.viewportSize();
  const branches = Array.from({ length: 4 }, (_, i) => ({
    id: "test-branch-" + i,
    ten_homestay:
      "Chi nhánh " + (i + 1) + " · Khu nghỉ dưỡng và căn hộ có tên đầy đủ",
  }));
  const rooms = branches.flatMap((b) =>
    Array.from({ length: 6 }, (_, i) => ({
      id: b.id + "-room-" + i,
      homestay_id: b.id,
      ten_phong:
        "Phòng " +
        (i + 101) +
        " · Ban công và hướng nhìn thành phố, tên đầy đủ",
    })),
  );
  const handler = async (route) => {
    if (route.request().method() !== "GET")
      throw Error("UI test attempted a write");
    await route.fulfill({
      json: {
        chi_nhanh: branches,
        phong: rooms,
        dong: [],
        don: [],
        tien_ton: [],
        truoc_thang: [],
      },
    });
  };
  await page.route("**/api/quan-tri/thu-chi/thong-ke?*", handler);
  const root = page.locator(".tk-page"),
    results = [];
  const heading = root.getByRole("heading", { name: "Thống kê", exact: true });
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  async function inspect(panel, width) {
    await panel.waitFor({ state: "visible" });
    const value = await panel.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return {
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        height: r.height,
        viewportWidth: visualViewport?.width || innerWidth,
        viewportHeight: visualViewport?.height || innerHeight,
        scrollX: el.scrollWidth > el.clientWidth + 1,
        popover: el.matches(":popover-open"),
        hit: el.contains(
          document.elementFromPoint(
            r.left + r.width / 2,
            r.top + Math.min(r.height - 8, 32),
          ),
        ),
      };
    });
    assert(value.popover, "Dropdown did not enter the top layer");
    assert(
      value.left >= 0 &&
        value.right <= value.viewportWidth + 1 &&
        value.top >= 0 &&
        value.bottom <= value.viewportHeight + 1,
      "Dropdown outside viewport at " + width + ": " + JSON.stringify(value),
    );
    assert(
      !value.scrollX && value.hit,
      "Dropdown clipped/covered or horizontally scrolls at " + width,
    );
    return value;
  }
  try {
    await root.getByRole("button", { name: "↻ Cập nhật", exact: true }).click();
    await root.locator(".tk-sheet").waitFor();
    for (const width of [1440, 1024, 768, 390]) {
      await page.setViewportSize({ width, height: 900 });
      const trigger = root.getByLabel("Đối tượng thống kê", { exact: true });
      await trigger.click();
      const panel = root.locator(".tk-scope-picker>div");
      await inspect(panel, width);
      const branchGroup = panel.locator(":scope>details").nth(0);
      if (!(await branchGroup.evaluate((el) => el.open)))
        await branchGroup.locator(":scope>summary").click();
      const grid = await branchGroup.locator(":scope>div").evaluate((el) => ({
        cols: getComputedStyle(el).gridTemplateColumns.split(" ").length,
        labels: [...el.querySelectorAll("label")].map((n) => ({
          height: n.getBoundingClientRect().height,
          wrap: getComputedStyle(n).whiteSpace,
          scroll: n.scrollWidth > n.clientWidth + 1,
        })),
      }));
      assert(
        grid.cols === (width > 700 ? 3 : 2),
        "Wrong object grid column count at " + width + ": " + grid.cols,
      );
      assert(
        grid.labels.every(
          (l) => l.height >= 34 && l.wrap === "normal" && !l.scroll,
        ),
        "Long names clipped at " + width,
      );
      await branchGroup
        .getByLabel("Hiển thị " + branches[0].ten_homestay, { exact: true })
        .check();
      assert(
        await root.locator(".tk-scope-picker").evaluate((el) => el.open),
        "Checkbox unexpectedly closed a multi-select",
      );
      const roomGroup = panel.locator(":scope>details").nth(1);
      if (!(await roomGroup.evaluate((el) => el.open)))
        await roomGroup.locator(":scope>summary").click();
      const roomBranch = roomGroup.locator(".tk-room-branch").first();
      if (!(await roomBranch.evaluate((el) => el.open)))
        await roomBranch.locator(":scope>summary").click();
      await inspect(panel, width);
      const roomCols = await roomBranch
        .locator(":scope>div")
        .evaluate(
          (el) => getComputedStyle(el).gridTemplateColumns.split(" ").length,
        );
      assert(
        roomCols === (width > 700 ? 3 : 2),
        "Room options not in columns at " + width,
      );
      await page.mouse.click(4, 4);
      assert(
        await root.locator(".tk-scope-picker").evaluate((el) => !el.open),
        "Outside click did not close object selector",
      );
      const add = root.getByLabel("Thêm cột thống kê", { exact: true });
      await add.click();
      await inspect(root.locator(".tk-add-column>div"), width);
      await page.keyboard.press("Escape");
      assert(
        await root.locator(".tk-add-column").evaluate((el) => !el.open),
        "Escape did not close add selector",
      );
      assert(
        await add.evaluate((el) => document.activeElement === el),
        "Escape did not restore trigger focus",
      );
      await trigger.click();
      await panel.waitFor({ state: "visible" });
      await root.getByLabel("Lưu hoặc xuất thống kê", { exact: true }).focus();
      await root
        .getByLabel("Lưu hoặc xuất thống kê", { exact: true })
        .press("Enter");
      assert(
        await root.locator(".tk-scope-picker").evaluate((el) => !el.open),
        "Opening another menu did not close the previous one",
      );
      const exportPanel = root.locator(".tk-toolbar>.stc-chart-menu>div");
      await inspect(exportPanel, width);
      await page.mouse.click(4, 4);
      const footer = root.locator(".tk-chart-controls");
      for (let i = 0; i < 2; i++) {
        const details = footer.locator(":scope>.stc-check-picker").nth(i);
        await details.locator(":scope>summary").click();
        await inspect(details.locator(":scope>div"), width);
        await root
          .getByRole("button", {
            name: "Hiển thị biểu đồ thống kê",
            exact: true,
          })
          .focus();
        assert(
          await details.evaluate((el) => !el.open),
          "Tab/focus outside did not close footer selector",
        );
      }
      const controlHeights = await root
        .locator(
          ".tk-toolbar>button,.tk-toolbar>details>summary,.tk-toolbar .lp-range-button",
        )
        .evaluateAll((els) =>
          els.map((el) => Math.round(el.getBoundingClientRect().height)),
        );
      assert(
        controlHeights.every((h) => h === 32),
        "Toolbar control heights differ at " + width + ": " + controlHeights,
      );
      results.push({
        width,
        objectColumns: grid.cols,
        roomColumns: roomCols,
        longNamesVisible: true,
        outsideCloses: true,
        escapeCloses: true,
        focusCloses: true,
        controlHeights,
      });
    }
    return results;
  } finally {
    await page.mouse.click(4, 4).catch(() => {});
    await page.unroute("**/api/quan-tri/thu-chi/thong-ke?*", handler);
    if (viewport) await page.setViewportSize(viewport);
  }
}

/** The caller should install duLieuGiaoDien(page) in the isolated context first. */
export async function kiemTraMenuQuanTri(page) {
  const assert = (ok, message) => {
    if (!ok) throw Error(message);
  };
  await page.setViewportSize({ width: 1280, height: 900 });
  // Export the current in-memory sheet so navigation has no unsaved-change prompt.
  const stats = page.locator(".tk-page");
  await stats.getByLabel("Lưu hoặc xuất thống kê", { exact: true }).click();
  const event = page.waitForEvent("download");
  await stats.getByLabel("Xuất bảng thống kê").selectOption("json");
  await event;
  assert(
    await stats
      .locator(".tk-toolbar>.stc-chart-menu")
      .evaluate((el) => !el.open),
    "Export menu did not dismiss after selection",
  );
  const profile = page.locator(".qt-profile-button").first();
  await profile.click();
  await page.locator(".qt-profile-dropdown").waitFor();
  await page.keyboard.press("Escape");
  assert(
    (await profile.getAttribute("aria-expanded")) === "false",
    "Profile Escape failed",
  );
  await profile.click();
  await page.mouse.click(500, 50);
  assert(
    (await profile.getAttribute("aria-expanded")) === "false",
    "Profile outside click failed",
  );
  const branchRoute = async (route) =>
    route.fulfill({
      json: {
        du_lieu: [
          {
            id: "11111111-1111-4111-8111-111111111111",
            ten_homestay: "Chi nhánh kiểm thử",
            dia_chi: "Địa chỉ kiểm thử",
            tinh_thanh: "TP Hồ Chí Minh",
            phuong_xa: "",
            so_dien_tho: "",
            trang_thai: "Đang hoạt động",
            so_phong: 1,
          },
        ],
        tong_so: 1,
        trang: 1,
        gioi_han: 10,
      },
    });
  await page.route("**/api/quan-tri/chi-nhanh?*", branchRoute);
  const results = [];
  try {
    for (const name of ["Phòng", "Chi nhánh"]) {
      await page
        .locator(".qt-nav-item")
        .getByText(name, { exact: true })
        .click();
      const trigger = page.locator(".cn-menu-trigger").first();
      await trigger.click();
      await page.locator(".cn-menu").waitFor();
      await page.mouse.click(500, 50);
      assert(
        (await page.locator(".cn-menu").count()) === 0,
        "Outside click failed for " + name,
      );
      await trigger.click();
      await page.keyboard.press("Escape");
      assert(
        (await page.locator(".cn-menu").count()) === 0,
        "Escape failed for " + name,
      );
      results.push({ menu: name, outsideCloses: true, escapeCloses: true });
    }
    await page.setViewportSize({ width: 768, height: 900 });
    const sidebar = page.locator(".qt-sidebar");
    assert(
      await sidebar.evaluate(
        (el) => getComputedStyle(el).visibility === "hidden",
      ),
      "Closed tablet sidebar covers content",
    );
    await page.getByRole("button", { name: "Mở menu", exact: true }).click();
    assert(
      await sidebar.evaluate((el) => el.classList.contains("qt-sidebar-open")),
      "Tablet menu cannot open",
    );
    await page.mouse.click(760, 450);
    assert(
      await sidebar.evaluate((el) => !el.classList.contains("qt-sidebar-open")),
      "Tablet outside click failed",
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByRole("button", { name: "Tổng quan", exact: true }).click();
    await page
      .getByRole("button", { name: "Mở tìm kiếm", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Tìm menu", exact: true })
      .fill("phòng");
    await page.mouse.click(90, 65);
    assert(
      (await page
        .getByRole("textbox", { name: "Tìm menu", exact: true })
        .count()) === 0,
      "Search outside click failed",
    );
    await page
      .getByRole("button", { name: "Báo cáo thống kê", exact: true })
      .click();
    const calendar = page.locator(".stc-compact-toolbar .lp-range-button");
    await calendar.click();
    await page.locator(".lp-range-portal").waitFor();
    await page.mouse.click(4, 4);
    assert(
      (await page.locator(".lp-range-portal").count()) === 0,
      "Calendar outside click failed",
    );
    await calendar.click();
    await page.keyboard.press("Escape");
    assert(
      (await page.locator(".lp-range-portal").count()) === 0,
      "Calendar Escape failed",
    );
    const heights = await page
      .locator(
        ".stc-compact-toolbar .stc-search,.stc-compact-toolbar .lp-range-button,.stc-header-actions>button,.stc-header-actions>select,#panel-thu-chi .stc-tools>select,#panel-thu-chi .stc-tools>details>summary,#panel-thu-chi .stc-tools .lp-range-button,#panel-thu-chi .stc-chart-actions>select,#panel-thu-chi .stc-chart-actions>details>summary",
      )
      .evaluateAll((els) =>
        els.map((el) => Math.round(el.getBoundingClientRect().height)),
      );
    assert(
      heights.every((h) => h === 32),
      "Ledger/chart toolbar heights differ: " + heights,
    );
    return {
      toolbarHeights: heights,
      menus: results,
      profile: true,
      search: true,
      tabletSidebar: true,
      calendar: true,
    };
  } finally {
    await page.unroute("**/api/quan-tri/chi-nhanh?*", branchRoute);
  }
}
