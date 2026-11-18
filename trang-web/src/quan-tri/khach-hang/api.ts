export async function qlApi(
  token: string,
  path: string,
  method = "GET",
  body?: unknown,
) {
  const r = await fetch("/api/quan-tri/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + token,
      "Content-Type": "application/json",
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const d = await r.json();
  if (!r.ok) throw Error(d.message || "Không thực hiện được");
  return d;
}
export const tien = (n: unknown) =>
  Number(n || 0).toLocaleString("vi-VN") + " ₫";
export const luc = (s: unknown) =>
  s
    ? new Date(String(s)).toLocaleString("vi-VN", {
        timeZone: "Asia/Ho_Chi_Minh",
      })
    : "—";
