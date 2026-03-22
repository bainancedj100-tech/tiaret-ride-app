// Coordinates for the center of Tiaret
export const TIARET_CENTER = {
  lat: 35.3725,
  lng: 1.3204
};

// Municipality boundary radius in km (approximate)
export const MUNICIPALITY_RADIUS_KM = 5;
export const BASE_FARE_DA = 100;           // flat fare inside the municipality
export const FARE_PER_KM_OUTSIDE_DA = 50; // per extra km beyond the boundary

/**
 * Calculates straight-line distance between two points in kilometers
 * using the Haversine formula.
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

/**
 * Calculates ride price.
 * 
 * Rules:
 *  - Inside Tiaret municipality (≤ MUNICIPALITY_RADIUS_KM from center): flat 100 DA
 *  - Outside: 100 DA + 50 DA × (distance_to_center − MUNICIPALITY_RADIUS_KM)
 *
 * @param {Object} destination - { lat, lng }
 * @returns {number} Price in DA (rounded)
 */
export const calculatePrice = (destination) => {
  if (!destination || !destination.lat || !destination.lng) return 0;

  const distanceToCenter = calculateDistanceKm(
    TIARET_CENTER.lat,
    TIARET_CENTER.lng,
    destination.lat,
    destination.lng
  );

  if (distanceToCenter <= MUNICIPALITY_RADIUS_KM) {
    // Inside the municipality → flat fare
    return BASE_FARE_DA;
  }

  // Outside the municipality → flat fare + extra per km beyond the boundary
  const extraKm = distanceToCenter - MUNICIPALITY_RADIUS_KM;
  const totalFare = BASE_FARE_DA + extraKm * FARE_PER_KM_OUTSIDE_DA;
  return Math.round(totalFare);
};
