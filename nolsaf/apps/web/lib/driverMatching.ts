import axios from "axios";

export interface MatchedDriver {
  id: string;
  name: string;
  phone?: string;
  rating: number;
  level: "Silver" | "Gold" | "Diamond";
  distance: number;
  estimatedTime: number;
  acceptanceRate?: number;
}

export interface MatchingResult {
  matched: boolean;
  bestDriver?: MatchedDriver;
  alternatives?: Array<{
    id: string;
    name: string;
    rating: number;
    level: string;
    distance: number;
    estimatedTime: number;
  }>;
  allCandidates?: Array<{
    id: string;
    name: string;
    rating: number;
    level: string;
    distance: number;
    estimatedTime: number;
    score: number;
  }>;
  message?: string;
}

/**
 * Find the best matching driver for a trip request
 * @param pickupLat - Pickup latitude
 * @param pickupLng - Pickup longitude
 * @param tripType - Type of trip (e.g., "Standard", "Premium")
 * @returns Matching result with best driver and alternatives
 */
export async function findBestDriver(
  pickupLat: number,
  pickupLng: number,
  tripType: string = "Standard"
): Promise<MatchingResult> {
  try {
    const response = await axios.post<MatchingResult>(
      "/api/driver/matching/find",
      {
        pickupLat,
        pickupLng,
        tripType,
      },
      { withCredentials: true }
    );

    return response.data;
  } catch (error: any) {
    console.error("Driver matching error:", error);
    return {
      matched: false,
      message: error.response?.data?.error || "Failed to find matching driver",
    };
  }
}

