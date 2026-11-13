/** Chạy trên trang quản trị đã mở Tin nhắn và chọn một hội thoại.
 * Có thể truyền Page từ Playwright hoặc chạy thân hàm qua MCP Playwright.
 * Chỉ đọc bố cục; không gửi tin hoặc đổi dữ liệu.
 */
export async function kiemTraBoCucChat(page) {
  const original = page.viewportSize();
  const results = [];
  try {
    for (const width of [390, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(350);
      const result = await page.evaluate(() => {
        const rect = (selector) => {
          const e = document.querySelector(selector);
          if (!e) throw Error('Thiếu phần tử: ' + selector);
          const r = e.getBoundingClientRect();
          return { x: r.x, y: r.y, width: r.width, bottom: r.bottom, right: r.right };
        };
        return {
          width: innerWidth,
          sidebar: rect('.chat-body > aside'),
          input: rect('.chat-main form input:not([type=file])'),
          send: rect('.chat-main form > button'),
          filesHidden: [...document.querySelectorAll('.chat-compose-tools input[type=file]')]
            .every(e => getComputedStyle(e).display === 'none'),
          bubbleHidden: [...document.querySelectorAll('.chat-inline > .chat-launch')]
            .every(e => !e.getBoundingClientRect().width),
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      if (!result.filesHidden || !result.bubbleHidden || result.overflow ||
          result.sidebar.width < 100 || result.input.width < 100 ||
          result.send.width < 44 || result.send.bottom > 900 ||
          result.send.right > width || result.input.right > result.send.x) {
        throw Error('Bố cục chat không đạt: ' + JSON.stringify(result));
      }
      results.push(result);
    }
    return results;
  } finally {
    if (original) await page.setViewportSize(original);
  }
}
