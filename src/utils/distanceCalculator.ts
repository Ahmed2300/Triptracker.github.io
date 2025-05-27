import { Location } from "@/services/firebaseService";

/**
 * Calculate the distance between two locations using the Haversine formula
 * @param location1 First location with latitude and longitude
 * @param location2 Second location with latitude and longitude
 * @returns Distance in miles
 */
export const calculateDistance = (location1: Location, location2: Location): number => {
  const R = 3958.8; // Earth's radius in miles
  const dLat = (location2.latitude - location1.latitude) * Math.PI / 180;
  const dLon = (location2.longitude - location1.longitude) * Math.PI / 180;
  
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(location1.latitude * Math.PI / 180) * Math.cos(location2.latitude * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  const distance = R * c; // Distance in miles
  
  return distance;
};

/**
 * Calculate the estimated travel time based on distance
 * @param distanceInMiles Distance in miles
 * @param speedMph Average speed in miles per hour (default: 25 mph for urban areas)
 * @returns Estimated travel time in minutes
 */
export const calculateEstimatedTime = (distanceInMiles: number, speedMph: number = 25): number => {
  // Time (hours) = Distance / Speed
  const timeInHours = distanceInMiles / speedMph;
  // Convert to minutes
  return Math.round(timeInHours * 60);
};

/**
 * Format time in minutes to a human-readable string
 * @param minutes Time in minutes
 * @returns Formatted time string (e.g., "5 mins" or "1 hr 15 mins")
 */
export const formatTravelTime = (minutes: number): string => {
  if (minutes < 1) {
    return "Less than 1 min";
  }
  
  if (minutes < 60) {
    return `${minutes} min${minutes !== 1 ? 's' : ''}`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours} hr${hours !== 1 ? 's' : ''}`;
  }
  
  return `${hours} hr${hours !== 1 ? 's' : ''} ${remainingMinutes} min${remainingMinutes !== 1 ? 's' : ''}`;
};
