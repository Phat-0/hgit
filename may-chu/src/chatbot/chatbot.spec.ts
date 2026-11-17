import { describe, it, expect, vi } from 'vitest';
import { answerGemini, cleanText, getGeminiModel, type Tool } from './gemini.js';
import { ChatbotCongCu, rankKnowledge, BOT_TOOLS } from './chatbot-cong-cu.js';
import { validateConfig, ChatbotService } from './chatbot.service.js';
const tools: Tool[] = [
  {
    name: 'tra_kien_thuc',
    description: 'test',
    parameters: { type: 'OBJECT', properties: {} },
  },
  {
    name: 'chuyen_nhan_vien',
    description: 'test',
    parameters: { type: 'OBJECT', properties: {} },
  },
];
const message = (parts: unknown[], finishReason = 'STOP') =>
  new Response(
    JSON.stringify({
      candidates: [{ content: { role: 'model', parts }, finishReason }],
      usageMetadata: { totalTokenCount: 10 },
    }),
  );
const input = () => ({
  key: 'test-only',
  system: 'test',
  history: [{ role: 'user' as const, parts: [{ text: 'Câu hỏi' }] }],
  tools,
  run: vi.fn(async () => ({ ok: true })),
});
describe('Gemini function calling boundary', () => {
  it('chỉ nhận model thuộc danh sách Gemini được hỗ trợ', () => {
    const previous=process.env.GEMINI_MODEL;
    try { process.env.GEMINI_MODEL='https://attacker.invalid'; expect(()=>getGeminiModel()).toThrow('MODEL_KHONG_DUOC_PHEP'); process.env.GEMINI_MODEL='gemini-3.5-flash-lite'; expect(getGeminiModel()).toBe('gemini-3.5-flash-lite'); }
    finally { if(previous===undefined) delete process.env.GEMINI_MODEL; else process.env.GEMINI_MODEL=previous; }
  });
  it('không cho tuyên bố đặt phòng thành công sau tra cứu', async()=> {
    const request=vi.fn().mockResolvedValueOnce(message([{functionCall:{name:'tra_kien_thuc',args:{}}}])).mockResolvedValueOnce(message([{text:'Mình đã đặt phòng thành công.'}]));
    await expect(answerGemini({...input(),request})).rejects.toThrow('TUYEN_BO_GIAO_DICH_KHONG_HOP_LE');
  });
  it('giữ chữ ký tool turn, chỉ gọi hàm cho phép, không gửi khóa vào URL', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        message([
          {
            functionCall: {
              name: 'tra_kien_thuc',
              args: { tu_khoa: 'giá' },
              id: 'fc1',
            },
            thoughtSignature: 'signature',
          },
        ]),
      )
      .mockResolvedValueOnce(message([{ text: 'Thông tin có nguồn.' }]));
    const x = input(),
      r = await answerGemini({ ...x, request });
    expect(r.tools).toEqual(['tra_kien_thuc']);
    expect(r.tokens).toBe(20);
    expect(x.run).toHaveBeenCalledWith('tra_kien_thuc', { tu_khoa: 'giá' });
    const [url, init] = request.mock.calls[0];
    expect(url).not.toContain('test-only');
    expect(init.headers['x-goog-api-key']).toBe('test-only');
    const body = JSON.parse(request.mock.calls[1][1].body);
    expect(body.contents[1].parts[0].thoughtSignature).toBe('signature');
    expect(body.contents[2].parts[0].functionResponse.id).toBe('fc1');
  });
  it('từ chối trả lời không tra cứu kể cả API không tuân theo ANY', async () => {
    await expect(
      answerGemini({
        ...input(),
        request: vi
          .fn()
          .mockResolvedValue(message([{ text: 'Còn phòng, giá 1 đồng' }])),
      }),
    ).rejects.toThrow('CHUA_TRA_CUU');
  });
  it('không gọi API nếu thiếu khóa', async () => {
    const request = vi.fn();
    await expect(
      answerGemini({ ...input(), key: '', request }),
    ).rejects.toThrow('THIEU_KHOA');
    expect(request).not.toHaveBeenCalled();
  });
  it('từ chối hàm tạo đơn do model tự gửi', async () => {
    const x = input();
    await expect(
      answerGemini({
        ...x,
        request: vi
          .fn()
          .mockResolvedValue(
            message([{ functionCall: { name: 'tao_don', args: {} } }]),
          ),
      }),
    ).rejects.toThrow('CONG_CU_KHONG_DUOC_PHEP');
    expect(x.run).not.toHaveBeenCalled();
  });
  it('không lộ response body của nhà cung cấp khi 429', async () => {
    await expect(
      answerGemini({
        ...input(),
        request: vi
          .fn()
          .mockResolvedValue(new Response('PRIVATE ERROR', { status: 429 })),
      }),
    ).rejects.toThrow('GIOI_HAN_AI');
  });
  it('dừng chuỗi gọi công cụ vô hạn', async () => {
    const request = vi
      .fn()
      .mockImplementation(async () =>
        message([{ functionCall: { name: 'tra_kien_thuc', args: {} } }]),
      );
    await expect(answerGemini({ ...input(), request })).rejects.toThrow(
      'QUA_NHIEU_CONG_CU',
    );
    expect(request).toHaveBeenCalledTimes(5);
  });
  it('không trả câu bị cắt dở', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        message([{ functionCall: { name: 'tra_kien_thuc', args: {} } }]),
      )
      .mockResolvedValueOnce(message([{ text: 'Câu bị cắt' }], 'MAX_TOKENS'));
    await expect(answerGemini({ ...input(), request })).rejects.toThrow(
      'TRA_LOI_CHUA_HOAN_TAT',
    );
  });
  it('ghi nhận handoff để máy chủ xử lý', async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(
        message([
          {
            functionCall: {
              name: 'chuyen_nhan_vien',
              args: { ly_do: 'Khách yêu cầu' },
            },
          },
        ]),
      )
      .mockResolvedValueOnce(message([{ text: 'Đã chuyển nhân viên' }]));
    expect((await answerGemini({ ...input(), request })).handoff).toBe(true);
  });
  it('ẩn email và số điện thoại trong ngữ cảnh gửi Gemini', () => {
    expect(
      cleanText('Gọi 0901234567 hoặc +84 901 234 567, mail a.b@example.com'),
    ).not.toMatch(/0901234567|901 234|example.com/);
  });
});
describe('Dữ liệu chatbot và quyền quản trị', () => {
  it('chỉ cho cấu hình nằm trong giới hạn', () => {
    expect(() =>
      validateConfig({
        bat: true,
        ten_bot: 'AI',
        huong_dan: '',
        loi_chuyen: 'Chuyển',
        gioi_han_ngay: 0,
        phien_ban: 1,
      }),
    ).toThrow();
    expect(() =>
      validateConfig({ bat: 'true', gioi_han_ngay: 300, phien_ban: 1 }),
    ).toThrow();
  });
  it('tìm kiến thức tiếng Việt có/không dấu, không nhận bài không khớp', () => {
    const rows = [
      { id: '1', tieu_de: 'Hủy đơn', noi_dung: 'Liên hệ nhân viên' },
      { id: '2', tieu_de: 'Bãi xe', noi_dung: 'Bãi đỗ ô tô' },
    ];
    expect(rankKnowledge(rows, 'huy don')[0].id).toBe('1');
    expect(rankKnowledge(rows, 'xxx')).toEqual([]);
  });
  it('mọi route cấu hình yêu cầu quản trị hệ thống trước khi đọc DB', async () => {
    const conn = { db: vi.fn() },
      admin = { kiemTraQuanTri: vi.fn().mockRejectedValue(new Error('Cấm')) };
    const bot = new ChatbotService(conn as never, admin as never, {} as never);
    await expect(bot.read('khach')).rejects.toThrow('Cấm');
    await expect(bot.save('khach', {})).rejects.toThrow('Cấm');
    await expect(bot.knowledge('khach', {})).rejects.toThrow('Cấm');
    await expect(bot.preview('khach', {})).rejects.toThrow('Cấm');
    await expect(bot.mode('khach', 'id', 'AI hỗ trợ')).rejects.toThrow('Cấm');
    expect(conn.db).not.toHaveBeenCalled();
  });
  it('chỉ công bố công cụ tra cứu và bản nháp, không có tác vụ đơn hay thanh toán', () => {
    expect(BOT_TOOLS.map((x) => x.name)).toEqual([
      'ghi_nhu_cau',
      'xem_danh_muc',
      'tra_kien_thuc',
      'tim_phong_trong',
      'bao_gia_phong',
      'xem_combo',
      'chuyen_nhan_vien',
    ]);
  });
  it('từ chối truy cập SQL, tham số lạ và khoảng giờ thiếu múi giờ', async () => {
    const tool = new ChatbotCongCu({} as never, {} as never);
    await expect(
      tool.run('sql', { query: 'select *' }, null),
    ).rejects.toThrow();
    await expect(
      tool.run('xem_danh_muc', { sql: 'SELECT' }, null),
    ).rejects.toThrow();
    await expect(
      tool.run(
        'tim_phong_trong',
        {
          bat_dau: '2026-11-18T10:00',
          ket_thuc: '2026-11-18T11:00',
          hinh_thuc_dat: 'Theo giờ',
        },
        null,
      ),
    ).rejects.toThrow('múi giờ');
  });
  it('chặn vượt phạm vi chi nhánh', async () => {
    const guest = { rooms: vi.fn() },
      tool = new ChatbotCongCu({} as never, guest as never);
    const result = await tool.run(
      'tim_phong_trong',
      {
        bat_dau: '2026-11-18T10:00+07:00',
        ket_thuc: '2026-11-18T11:00+07:00',
        hinh_thuc_dat: 'Theo giờ',
        chi_nhanh_id: 'branch-b',
      },
      'branch-a',
    );
    expect(result).toHaveProperty('loi');
    expect(guest.rooms).not.toHaveBeenCalled();
  });
  it('gọi đúng máy tính giá hiện tại, không tin giá model', async () => {
    const guest = { quote: vi.fn().mockResolvedValue({ tien_phong: 275000 }) },
      tool = new ChatbotCongCu({} as never, guest as never),
      args = {
        bat_dau: '2026-11-18T10:00+07:00',
        ket_thuc: '2026-11-18T12:00+07:00',
        hinh_thuc_dat: 'Theo giờ',
        phong_id: '123',
      };
    expect(await tool.run('bao_gia_phong', args, null)).toMatchObject({
      tien_phong: 275000,
      giu_cho: false,
    });
    await expect(
      tool.run('bao_gia_phong', { ...args, tien_phong: 1 }, null),
    ).rejects.toThrow();
  });
  it('bản nháp nhu cầu chỉ nhận trường hợp lệ và không cập nhật hồ sơ', async () => {
    const db = vi.fn(),
      tool = new ChatbotCongCu({ db } as never, {} as never);
    expect(
      await tool.run(
        'ghi_nhu_cau',
        { tom_tat: 'Hai người, thích yên tĩnh', so_khach: 2 },
        null,
      ),
    ).toMatchObject({ so_khach: 2 });
    await expect(
      tool.run('ghi_nhu_cau', { tom_tat: 'a', so_khach: 0 }, null),
    ).rejects.toThrow();
    await expect(
      tool.run('ghi_nhu_cau', { tom_tat: 'a', nguoi_dung_id: 'x' }, null),
    ).rejects.toThrow();
    expect(db).not.toHaveBeenCalled();
  });
});
