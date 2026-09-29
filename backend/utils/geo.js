function haversineKm(a, b) {
  const R = 6371;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function pointToSegmentKm(point, a, b) {
  const latScale = 111.32;
  const lonScale = 111.32 * Math.cos((point.latitude * Math.PI) / 180);
  const px = point.longitude * lonScale;
  const py = point.latitude * latScale;
  const ax = a[0] * lonScale;
  const ay = a[1] * latScale;
  const bx = b[0] * lonScale;
  const by = b[1] * latScale;
  const dx = bx - ax;
  const dy = by - ay;
  const t = dx * dx + dy * dy === 0 ? 0 : Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const x = ax + t * dx;
  const y = ay + t * dy;
  return Math.hypot(px - x, py - y);
}

function distanceToRouteKm(point, geometry) {
  const coords = geometry?.coordinates || [];
  if (coords.length < 2) return null;
  let min = Infinity;
  for (let i = 1; i < coords.length; i += 1) {
    min = Math.min(min, pointToSegmentKm(point, coords[i - 1], coords[i]));
  }
  return Number(min.toFixed(3));
}

module.exports = { haversineKm, distanceToRouteKm };
