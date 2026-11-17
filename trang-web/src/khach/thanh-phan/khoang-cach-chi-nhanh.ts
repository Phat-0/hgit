export function khoangCachKm(a: [number, number], b: [number, number]) {
  const rad = (n: number) => (n * Math.PI) / 180,
    dLat = rad(b[0] - a[0]),
    dLng = rad(b[1] - a[1]);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
