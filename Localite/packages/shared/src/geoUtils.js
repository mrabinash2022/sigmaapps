const EARTH_RADIUS_KM = 6371;

function toRadians(deg) {
  return (deg * Math.PI) / 180;
}

export function haversineKm(lat1, lon1, lat2, lon2) {
  const aLat = Number(lat1);
  const aLon = Number(lon1);
  const bLat = Number(lat2);
  const bLon = Number(lon2);
  if ([aLat, aLon, bLat, bLon].some((v) => Number.isNaN(v))) return null;

  const dLat = toRadians(bLat - aLat);
  const dLon = toRadians(bLon - aLon);
  const x = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(aLat)) * Math.cos(toRadians(bLat)) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function isWithinDeliveryRadius(shopLat, shopLon, radiusKm, customerLat, customerLon) {
  if (!radiusKm || Number(radiusKm) <= 0) return true;
  const distance = haversineKm(shopLat, shopLon, customerLat, customerLon);
  if (distance == null) return true;
  return distance <= Number(radiusKm);
}

export function buildMapsDirectionsUrl({ destinationLat, destinationLon, destinationAddress }) {
  if (destinationLat != null && destinationLon != null) {
    return `https://www.google.com/maps/dir/?api=1&destination=${destinationLat},${destinationLon}`;
  }
  if (destinationAddress?.trim()) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destinationAddress.trim())}`;
  }
  return null;
}
