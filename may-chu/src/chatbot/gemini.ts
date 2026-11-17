export const GEMINI_MODELS = ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-3.5-flash-lite'] as const;
export function getGeminiModel() {
  const model = process.env.GEMINI_MODEL?.trim() || 'gemini-2.5-flash';
  if (!GEMINI_MODELS.some(value => value === model)) throw new Error('MODEL_KHONG_DUOC_PHEP');
  return model;
}
export type Part = {
  text?: string;
  thought?: boolean;
  functionCall?: { name: string; args?: Record<string, unknown>; id?: string };
  [key: string]: unknown;
};
export type Content = { role: 'user' | 'model'; parts: Part[] };
export type Tool = {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
};
export type BotResult = {
  text: string;
  handoff: boolean;
  tools: string[];
  tokens: number;
  needs?: Record<string, unknown>;
};
export const cleanText = (s: string) =>
  s
    .replace(/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi, '[email]')
    .replace(/(?:\+84|0)(?:[ .-]?\d){9,10}\b/g, '[số điện thoại]');
/** Official REST endpoint only; secret never enters URLs, traces or browser responses. */
export async function answerGemini(input: {
  key: string;
  system: string;
  history: Content[];
  tools: Tool[];
  run: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  request?: typeof fetch;
}): Promise<BotResult> {
  if (!input.key) throw new Error('THIEU_KHOA');
  const model = getGeminiModel();
  const history = structuredClone(input.history),
    used: string[] = [];
  const signal = AbortSignal.timeout(35000);
  let tokens = 0,
    handoff = false;
  let needs: Record<string, unknown> | undefined;
  for (let round = 0; round < 5; round++) {
    const res = await (input.request || fetch)(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': input.key,
        },
        signal,
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: input.system }] },
          contents: history,
          tools: [{ functionDeclarations: input.tools }],
          toolConfig: {
            functionCallingConfig: { mode: round === 0 ? 'ANY' : 'AUTO' },
          },
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 1800,
            ...(model.startsWith('gemini-2.5-') ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
          },
        }),
      },
    );
    if (!res.ok)
      throw new Error(res.status === 429 ? 'GIOI_HAN_AI' : 'LOI_NHA_CUNG_CAP');
    const body = (await res.json()) as {
      candidates?: { content?: Content; finishReason?: string }[];
      usageMetadata?: { totalTokenCount?: number };
    };
    tokens += body.usageMetadata?.totalTokenCount || 0;
    const candidate = body.candidates?.[0],
      content = candidate?.content;
    if (!content?.parts?.length) throw new Error('KHONG_CO_TRA_LOI');
    const calls = content.parts.flatMap((p) =>
      p.functionCall ? [p.functionCall] : [],
    );
    if (!calls.length) {
      if (candidate?.finishReason !== 'STOP')
        throw new Error('TRA_LOI_CHUA_HOAN_TAT');
      const text = content.parts
        .filter((p) => !p.thought)
        .map((p) => p.text || '')
        .join('')
        .trim();
      if (!text || text.length > 4000) throw new Error('TRA_LOI_KHONG_HOP_LE');
      if (!used.some(name => name !== 'ghi_nhu_cau')) throw new Error('CHUA_TRA_CUU');
      if (/đã\s+(?:xác nhận\s+(?:thanh toán|đơn)|đặt\s+(?:phòng|đơn)\s+thành công|giữ\s+(?:phòng|chỗ)|hủy\s+(?:đơn|đặt phòng)|hoàn tiền)/iu.test(text)) throw new Error('TUYEN_BO_GIAO_DICH_KHONG_HOP_LE');
      return {
        text,
        handoff,
        tools: used,
        tokens,
        ...(needs ? { needs } : {}),
      };
    }
    if (calls.length > 5 || round === 4) throw new Error('QUA_NHIEU_CONG_CU');
    // Keep all model parts (including thought signatures) for the next tool turn.
    history.push(content);
    const parts: Part[] = [];
    for (const call of calls) {
      if (!input.tools.some((t) => t.name === call.name))
        throw new Error('CONG_CU_KHONG_DUOC_PHEP');
      if (
        !call.args ||
        Array.isArray(call.args) ||
        typeof call.args !== 'object'
      )
        throw new Error('THAM_SO_CONG_CU');
      if (signal.aborted) throw new Error('HET_THOI_GIAN');
      const output = await input.run(call.name, call.args);
      if (signal.aborted) throw new Error('HET_THOI_GIAN');
      used.push(call.name);
      if (call.name === 'chuyen_nhan_vien') handoff = true;
      if (call.name === 'ghi_nhu_cau' && output && typeof output === 'object')
        needs = output as Record<string, unknown>;
      parts.push({
        functionResponse: {
          name: call.name,
          ...(call.id ? { id: call.id } : {}),
          response: { ket_qua: output },
        },
      });
    }
    history.push({ role: 'user', parts });
  }
  throw new Error('QUA_NHIEU_CONG_CU');
}
