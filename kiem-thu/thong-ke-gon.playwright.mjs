/** Chạy sau duLieuGiaoDien(page), mở tab Thống kê trong context kiểm thử riêng. */
export async function kiemTraThongKeGon(page) {
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  await page.setViewportSize({ width: 1440, height: 1000 });
  check(
    (await page.locator(".tk-sheet thead tr").count()) === 1,
    "Header chung chỉ một hàng",
  );
  check(
    (await page.locator(".tk-name button").count()) === 0,
    "Không có biểu tượng đối tượng",
  );
  await page.locator(".tk-scope-picker>summary").first().click();
  const root = page.locator('[aria-label="Chọn nhiều đối tượng thống kê"]');
  await root
    .locator(":scope>details")
    .nth(0)
    .locator("summary")
    .first()
    .click();
  await root
    .getByLabel("Hiển thị Chi nhánh kiểm thử trung tâm", { exact: true })
    .check();
  await root
    .locator(":scope>details")
    .nth(1)
    .locator("summary")
    .first()
    .click();
  check(
    (await root.getByLabel("Hiển thị Tổng phòng", { exact: true }).count()) ===
      1,
    "Tổng nằm trong phòng",
  );
  await root.locator(".tk-room-branch>summary").click();
  await root.getByLabel("Hiển thị P101", { exact: true }).check();
  await page.mouse.click(4, 4);
  const cells = page.locator(".tk-sheet tbody tr td:nth-child(3)");
  await cells.last().scrollIntoViewIfNeeded();
  await cells.first().click({ trial: true });
  const a = await cells.first().boundingBox(),
    b = await cells.last().boundingBox();
  await page.mouse.move(a.x + 15, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(b.x + 15, b.y + b.height / 2, { steps: 12 });
  await page.mouse.up();
  check(
    (await page.locator(".tk-sheet tr[aria-selected=true]").count()) === 3,
    "Kéo chọn liên tiếp ba hàng",
  );
  check(
    (await page.evaluate(() => getSelection()?.toString())) === "",
    "Không chọn ký tự",
  );
  await cells.first().click();
  check(
    (await page.locator(".tk-sheet tr[aria-selected=true]").count()) === 2,
    "Bấm lại bỏ chọn",
  );
  await cells.first().click();
  check(
    (await page.locator(".tk-sheet tr[aria-selected=true]").count()) === 3,
    "Bấm chọn lại",
  );
  await page.getByLabel("Chọn tất cả hàng thống kê", { exact: true }).uncheck();
  await cells.first().click();
  await cells.last().click({ modifiers: ["Shift"] });
  check(
    (await page.locator(".tk-sheet tr[aria-selected=true]").count()) === 3,
    "Shift chọn khoảng ba hàng",
  );
  await page
    .locator(".tk-value-chip")
    .first()
    .locator("button")
    .first()
    .click();
  const editor = page.locator(".tk-column-editor");
  check(
    (await editor.locator(".lp-range-button").count()) === 1,
    "Giá trị chung có lịch riêng và thêm khoảng",
  );
  await editor.locator(".lp-range-button").first().click();
  check(
    (await page.locator(".lp-month-strip button").count()) === 12,
    "Dải 12 tháng",
  );
  check(
    (await page.locator(".lp-year-strip strong").innerText()) === "2026",
    "Năm phía trên",
  );
  await page
    .locator(".lp-calendar-month")
    .first()
    .getByRole("button", { name: "1", exact: true })
    .click();
  await page
    .locator(".lp-calendar-month")
    .first()
    .getByRole("button", { name: "2", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Thêm khoảng lịch", exact: true })
    .click();
  await page
    .locator(".lp-calendar-month")
    .first()
    .getByRole("button", { name: "10", exact: true })
    .click();
  await page
    .locator(".lp-calendar-month")
    .first()
    .getByRole("button", { name: "11", exact: true })
    .click();
  check(
    (await page
      .locator(".lp-range-portal")
      .getByLabel(/^Bỏ khoảng ngày/)
      .count()) === 2,
    "Hai khoảng riêng",
  );
  await page.locator(".lp-range-close").click();
  await editor.getByLabel("Chia cột thống kê").selectOption("ngay");
  // Theo ngày kế thừa lịch chung; xóa thứ để xác nhận hàng ngày được ẩn.
  check(
    (await page.locator(".tk-sheet thead tr").count()) === 2,
    "Có hàng ngày khi chia ngày",
  );
  for (const input of await editor.locator(".tk-weekdays input").all())
    await input.uncheck();
  check(
    (await page.locator(".tk-sheet thead tr").count()) === 1,
    "Không còn ngày thì ẩn hàng dưới",
  );
  await editor.getByRole("button", { name: "Xong", exact: true }).click();
  await page.getByLabel("Chọn tất cả hàng thống kê", { exact: true }).uncheck();
  await page.getByLabel("Chọn hàng P101", { exact: true }).check();
  await page.locator(".tk-values-picker>summary").click();
  await page
    .locator(".tk-values-picker>div>.tk-calc-options")
    .first()
    .locator(":scope>summary")
    .click();
  await page.locator(".tk-metric-dates>summary").nth(1).click();
  const dateGrid = page
    .locator(".tk-metric-dates")
    .nth(1)
    .locator(".tk-date-options");
  check(
    (await dateGrid.evaluate(
      (e) => getComputedStyle(e).gridTemplateColumns.split(" ").length,
    )) === 5,
    "Năm ngày mỗi hàng",
  );
  await dateGrid.locator("input").nth(0).check();
  await page.locator(".tk-metric-dates>summary").nth(2).click();
  await page
    .locator(".tk-metric-dates")
    .nth(2)
    .locator("input")
    .first()
    .check();
  await page.mouse.click(4, 4);
  await page.getByLabel("Hiển thị biểu đồ thống kê", { exact: true }).click();
  check(
    (await page.locator(".tk-chart").count()) === 1,
    "Chỉ một khối biểu đồ",
  );
  check(
    (await page
      .getByRole("img", { name: "Biểu đồ cột thống kê", exact: true })
      .count()) === 1,
    "Một biểu đồ cột",
  );
  check(
    (await page
      .getByRole("img", { name: "Biểu đồ tròn thống kê", exact: true })
      .count()) === 1,
    "Một biểu đồ tròn",
  );
  const widths = [];
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.locator(".tk-values-picker>summary").click();
    const panel = page.locator(".tk-values-picker>div");
    check(
      await panel.evaluate((e) => {
        const r = e.getBoundingClientRect();
        return (
          r.left >= 0 &&
          r.right <= innerWidth &&
          r.top >= 0 &&
          r.bottom <= innerHeight
        );
      }),
      "Danh sách nằm trong màn hình " + width,
    );
    await page.mouse.click(4, 4);
    widths.push(width);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  return {
    dragRows: 3,
    noTextSelection: true,
    multipleRanges: 2,
    conditionalHeader: true,
    dateColumns: 5,
    chartPairs: 1,
    widths,
  };
}
export async function kiemTraThuChiGon(page) {
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  await page.getByRole("tab", { name: "Thu chi", exact: true }).click();
  const block = page.locator("#panel-thu-chi .stc-charts");
  check(
    (await block.locator(".lp-range-button").count()) === 2,
    "Hai lịch biểu đồ",
  );
  await block.getByLabel("Hiển thị thu hoặc chi").selectOption("both");
  await block.getByLabel("Loại đối tượng biểu đồ").selectOption("phong");
  await block
    .locator('[aria-label="Chọn phòng biểu đồ"]')
    .locator("..")
    .locator(":scope>summary")
    .click();
  await block.locator(".tk-room-branch>summary").click();
  check(
    (await block.locator(".tk-room-branch label").innerText()).trim() ===
      "P101",
    "Chỉ mã phòng",
  );
  await block.locator(".tk-room-branch input").check();
  await page.mouse.click(4, 4);
  await block.getByLabel("Tùy chọn biểu đồ", { exact: true }).click();
  await block
    .getByRole("group", {name:"Sắp xếp biểu đồ",exact:true})
    .getByRole("button",{name:"Lớn → nhỏ",exact:true}).click();
  check(
    (await block.locator("[data-chart=cot] rect").count()) === 2,
    "Hiện cả thu và chi",
  );
  check(
    (await block.getByLabel("Màu biểu đồ thu").inputValue()) === "#99cdbd",
    "Màu thu nhẹ",
  );
  check(
    (await block.getByLabel("Màu biểu đồ chi").inputValue()) === "#c7b2df",
    "Màu chi nhẹ",
  );
  await page.mouse.click(4, 4);
  const barPeriod = await block.locator(".lp-range-button").first().innerText();
  await block.locator(".stc-pie-calendar .lp-range-button").click();
  await page
    .locator(".lp-month-strip button")
    .filter({ hasText: /^T10$/ })
    .click();
  await page
    .locator(".lp-range-portal")
    .getByRole("button", { name: "Chọn tháng", exact: true })
    .click();
  check(
    (await block.locator(".lp-range-button").first().innerText()) === barPeriod,
    "Lịch tròn độc lập lịch cột",
  );
  await page.waitForFunction(
    () => !document.querySelector("#panel-thu-chi [role=status]"),
  );
  check(
    (await block.locator("[data-chart=cot] rect").count()) === 2,
    "Đổi lịch tròn giữ dữ liệu cột",
  );
  check(
    (await block.locator("[data-chart=tron]").count()) === 1,
    "Một hình tròn",
  );
  return {
    calendars: 2,
    independent: true,
    roomCode: "P101",
    series: 2,
    sort: "desc",
    softColors: true,
  };
}
export async function kiemTraNhomGiaTri(page) {
  const check = (v, m) => {
    if (!v) throw Error(m);
  };
  for (const group of ["Trung bình ngày", "Trung bình tuần"]) {
    await page.getByLabel("Thêm cột thống kê", { exact: true }).click();
    const option = page
      .locator(".tk-add-column .tk-calc-options")
      .filter({
        has: page
          .locator("summary")
          .filter({ hasText: new RegExp("^" + group + "$") }),
      });
    await option.locator(":scope>summary").click();
    await option.getByRole("button", { name: "Thu", exact: true }).click();
    check(
      (await page.getByLabel("Cách tính cột", { exact: true }).inputValue()) ===
        (group === "Trung bình ngày" ? "tb_ngay" : "tb_tuan"),
      "Thêm giá trị đúng cách tính",
    );
    await page
      .locator(".tk-column-editor")
      .getByRole("button", { name: "Xong", exact: true })
      .click();
  }
  check(
    (await page.locator(".tk-calc-group").count()) === 3,
    "Ba nhóm ô giá trị",
  );
  check(
    !(await page.locator(".tk-column-list").innerText()).includes("⚙"),
    "Chỉ nút ×",
  );
  await page.locator(".tk-values-picker>summary").click();
  for (const group of ["Trung bình ngày", "Trung bình tuần"]) {
    const options = page
      .locator(".tk-values-picker>div>.tk-calc-options")
      .filter({
        has: page
          .locator(":scope>summary")
          .filter({ hasText: new RegExp("^" + group + "$") }),
      });
    await options.locator(":scope>summary").click();
    await options.locator(".tk-metric-dates>summary").click();
    await options.locator(".tk-date-options input").first().check();
  }
  await page.mouse.click(4, 4);
  check(
    (await page.locator(".tk-chart-calc-group").count()) === 3,
    "Biểu đồ nhóm ba cách tính",
  );
  check(
    (await page.locator(".tk-chart-category h5").allTextContents()).every(
      (x) => x === "Phòng",
    ),
    "Phân loại phòng trong cách tính",
  );
  check(
    (await page.locator(".tk-chart-branch h6").allTextContents()).every(
      (x) => x === "Chi nhánh kiểm thử trung tâm",
    ),
    "Phòng nhóm tiếp theo chi nhánh",
  );
  const chip = page.locator(".tk-value-chip").first();
  await chip.locator("button").first().click();
  await page.locator(".tk-column-editor .lp-range-button").click();
  const month = await page
      .getByRole("button", { name: "Chọn tháng", exact: true })
      .boundingBox(),
    add = await page
      .getByRole("button", { name: "Thêm khoảng lịch", exact: true })
      .boundingBox(),
    close = await page.locator(".lp-range-close").boundingBox();
  check(month.height <= 28, "Nút chọn tháng nhỏ");
  check(Math.abs(add.y - close.y) < 2, "Nút + cùng hàng Đóng");
  check(
    (await page.locator(".lp-range-chip").count()) === 2,
    "Khoảng nằm trong lịch",
  );
  await page.locator(".lp-range-close").click();
  await page
    .locator(".tk-column-editor")
    .getByRole("button", { name: "Xong", exact: true })
    .click();
  return {
    groups: 3,
    chartGroups: 3,
    roomBranchNesting: true,
    monthHeight: month.height,
    plusBesideClose: true,
  };
}
