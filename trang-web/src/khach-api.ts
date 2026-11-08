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
    throw Error(
      Array.isArray(j.message)
        ? j.message.join("; ")
        : j.message || "Không thực hiện được yêu cầu. Vui lòng thử lại",
    );
  return j;
}
