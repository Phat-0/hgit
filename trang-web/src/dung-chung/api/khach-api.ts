export class KhachApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
  ) {
    super(message);
    this.name = "KhachApiError";
  }

  get phongKhongKhaDung() {
    return this.status === 409 &&
      (this.code === "PHONG_KHONG_KHA_DUNG" ||
        (!this.code && this.message.startsWith("Phòng vừa được đặt")));
  }
}

export async function khachApi<T>(
  path: string,
  method = "GET",
  body?: unknown,
  token?: string,
  guest?: string,
): Promise<T> {
  const r = await fetch("/api/khach" + path, {
    method,
    headers: {
      ...(token ? { Authorization: "Bearer " + token } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(guest ? { "X-Guest-Chat": guest } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok)
    throw new KhachApiError(
      r.status,
      Array.isArray(j.message)
        ? j.message.join("; ")
        : j.message || "Không thực hiện được yêu cầu. Vui lòng thử lại",
      typeof j.code === "string" ? j.code : undefined,
    );
  return j;
}
