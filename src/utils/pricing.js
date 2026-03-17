// Coordinates for the center of Tiaret
export const TIARET_CENTER = {
  lat: 35.3725,
  lng: 1.3204
};

export const RADIUS_KM = 5;
export const BASE_FARE_DA = 100;
export const FARE_PER_KM_OUTSIDE_DA = 50;

/**
 * Calculates straight-line distance between two points in kilometers
 * using the Haversine formula.
 */
export const calculateDistanceKm = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
};

const deg2rad = (deg) => {
  return deg * (Math.PI / 180);
};

/**
 * Calculates the price for a ride or delivery based on the destination.
 * Algorithm: Total Fare = Base Fare + (Distance * Rate per KM)
 * 
 * @param {Object} destination - {lat, lng}
 * @returns {number} Price in DA
 */
export const calculatePrice = (destination) => {
  if (!destination || !destination.lat || !destination.lng) return 0;

  const distanceToCenter = calculateDistanceKm(
    TIARET_CENTER.lat, 
    TIARET_CENTER.lng, 
    destination.lat, 
    destination.lng
  );

  // Calculate fare based strictly on the required algorithm
  const totalFare = BASE_FARE_DA + (distanceToCenter * FARE_PER_KM_OUTSIDE_DA);
  
  // Round to nearest whole number for cleaner UI
  return Math.round(totalFare);
};
