import { Router, RequestHandler } from "express";
import requireRole, { requireAuth, AuthedRequest } from "../middleware/auth";
import { prisma } from "@nolsaf/prisma";

const router = Router();

router.use(requireAuth as any, requireRole("DRIVER") as any);

/**
 * POST /api/driver/matching/find
 * Body: { pickupLat: number, pickupLng: number, tripType?: string }
 * Finds the best matching driver for a trip request based on:
 * - Proximity (distance to pickup)
 *   - Standard trips: 3km search radius
 *   - Emergency trips: 5km search radius (4-5km range)
 * - Driver level (Silver, Gold, Diamond)
 * - Rating
 * - Availability
 * - Estimated time to reach rider (faster for emergency: 40 km/h vs 30 km/h)
 * - Acceptance rate
 * - Recent performance
 */
const findBestDriver: RequestHandler = async (req, res) => {
  try {
    const { pickupLat, pickupLng, tripType = "Standard" } = req.body ?? {};

    if (typeof pickupLat !== "number" || typeof pickupLng !== "number") {
      return res.status(400).json({ error: "pickupLat and pickupLng are required" });
    }

    // Determine search radius based on trip type
    // Emergency trips: 4-5km, Standard trips: 3km
    let radiusKm = 3; // Default for standard trips
    if (tripType && (tripType.toLowerCase() === "emergency" || tripType.toLowerCase().includes("emergency"))) {
      // For emergency cases, use 4-5km radius (we'll use 5km to maximize options)
      radiusKm = 5;
    }

    // Find all available drivers within the determined radius
    // We'll use a simple bounding box approach for now
    const latDelta = radiusKm / 111; // roughly 1 degree = 111km
    const lngDelta = radiusKm / (111 * Math.cos((pickupLat * Math.PI) / 180));

    let availableDrivers: any[] = [];

    try {
      // Get available drivers with their locations
      if ((prisma as any).driverLocation && (prisma as any).driverAvailability) {
        const drivers = await (prisma as any).driverLocation.findMany({
          where: {
            lat: {
              gte: String(pickupLat - latDelta),
              lte: String(pickupLat + latDelta),
            },
            lng: {
              gte: String(pickupLng - lngDelta),
              lte: String(pickupLng + lngDelta),
            },
          },
          include: {
            driver: {
              include: {
                availability: true,
              },
            },
          },
        });

        // Filter for available drivers only
        availableDrivers = drivers.filter(
          (d: any) => d.driver?.availability?.available === true
        );
      } else {
        // Fallback: try to get from user table with role DRIVER
        const drivers = await prisma.user.findMany({
          where: {
            role: "DRIVER",
          },
          take: 20, // Limit for performance
        });

        // Mock locations for demo (in production, use actual location data)
        availableDrivers = drivers.map((d: any, idx: number) => ({
          driverId: d.id,
          lat: String(pickupLat + (Math.random() - 0.5) * 0.1),
          lng: String(pickupLng + (Math.random() - 0.5) * 0.1),
          driver: {
            id: d.id,
            name: d.name,
            rating: d.rating || 4.0,
            availability: { available: true },
          },
        }));
      }
    } catch (e) {
      console.warn("Error fetching drivers:", e);
      // Return empty array if query fails
      availableDrivers = [];
    }

    if (availableDrivers.length === 0) {
      return res.json({
        matched: false,
        message: "No available drivers found nearby",
        drivers: [],
      });
    }

    // Calculate distance and score for each driver
    interface DriverScore {
      driver: any;
      distance: number; // in km
      estimatedTime: number; // in minutes
      score: number; // composite score
      level: "Silver" | "Gold" | "Diamond";
      levelScore: number;
      rating: number;
      acceptanceRate: number;
      totalTrips: number;
    }

    const driverScores: DriverScore[] = [];

    for (const driverData of availableDrivers) {
      const driver = driverData.driver || driverData;
      const lat = Number(driverData.lat);
      const lng = Number(driverData.lng);

      // Calculate distance using Haversine formula
      const R = 6371; // Earth's radius in km
      const dLat = ((lat - pickupLat) * Math.PI) / 180;
      const dLng = ((lng - pickupLng) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((pickupLat * Math.PI) / 180) *
          Math.cos((lat * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distance = R * c;

      // Skip if too far (beyond reasonable radius)
      if (distance > radiusKm) continue;

      // Get driver metrics
      let rating = Number(driver.rating) || 4.0;
      let totalTrips = 0;
      let acceptedTrips = 0;
      let totalMiles = 0;
      let totalReviews = 0;
      let goalsCompleted = 0;

      try {
        // Try to get trip statistics
        if ((prisma as any).trip) {
          const trips = await (prisma as any).trip.findMany({
            where: { driverId: driver.id },
          });
          totalTrips = trips.length;
          acceptedTrips = trips.filter(
            (t: any) => t.status !== "CANCELLED" && t.status !== "DECLINED"
          ).length;

          // Calculate total miles (if available)
          totalMiles = trips.reduce(
            (sum: number, t: any) => sum + (Number(t.distance) || 0),
            0
          );
        }

        // Get reviews count
        if ((prisma as any).review) {
          const reviews = await (prisma as any).review.findMany({
            where: { driverId: driver.id },
          });
          totalReviews = reviews.length;
        }
      } catch (e) {
        // Use defaults if queries fail
      }

      // Determine driver level based on metrics
      // Level thresholds (adjust as needed):
      // Silver: 0-99 miles, 0-49 trips, 0-24 reviews
      // Gold: 100-499 miles, 50-199 trips, 25-99 reviews
      // Diamond: 500+ miles, 200+ trips, 100+ reviews
      let level: "Silver" | "Gold" | "Diamond" = "Silver";
      let levelScore = 1.0;

      if (
        totalMiles >= 500 ||
        totalTrips >= 200 ||
        totalReviews >= 100
      ) {
        level = "Diamond";
        levelScore = 3.0; // Highest priority
      } else if (
        totalMiles >= 100 ||
        totalTrips >= 50 ||
        totalReviews >= 25
      ) {
        level = "Gold";
        levelScore = 2.0;
      } else {
        level = "Silver";
        levelScore = 1.0;
      }

      // Calculate acceptance rate
      const acceptanceRate =
        totalTrips > 0 ? acceptedTrips / totalTrips : 0.9; // Default to 90% if no data

      // Estimate time to reach rider
      // For emergency trips, assume faster response (40 km/h), standard trips use 30 km/h
      const avgSpeed = tripType && (tripType.toLowerCase() === "emergency" || tripType.toLowerCase().includes("emergency")) ? 40 : 30;
      const estimatedTime = Math.round((distance / avgSpeed) * 60); // in minutes

      // Calculate composite score
      // Factors:
      // 1. Proximity (40% weight) - closer is better
      // 2. Level (25% weight) - higher level is better
      // 3. Rating (20% weight) - higher rating is better
      // 4. Acceptance rate (10% weight) - higher is better
      // 5. Estimated time (5% weight) - lower is better

      const proximityScore = Math.max(0, 1 - distance / radiusKm); // 0-1, higher is better
      const ratingScore = rating / 5.0; // 0-1, normalize to 5-star scale
      const acceptanceScore = acceptanceRate; // 0-1
      const timeScore = Math.max(0, 1 - estimatedTime / 30); // 0-1, assuming 30 min max

      const compositeScore =
        proximityScore * 0.4 +
        (levelScore / 3.0) * 0.25 + // Normalize level score
        ratingScore * 0.2 +
        acceptanceScore * 0.1 +
        timeScore * 0.05;

      // Bonus for Diamond level drivers (can override proximity slightly)
      // If a Diamond driver is within 1.5x the distance of the nearest driver, they get priority
      const levelBonus = level === "Diamond" ? 0.15 : level === "Gold" ? 0.08 : 0;
      const finalScore = compositeScore + levelBonus;

      driverScores.push({
        driver: {
          id: driver.id,
          name: driver.name,
          phone: driver.phone,
          rating,
          level,
        },
        distance: Math.round(distance * 10) / 10, // Round to 1 decimal
        estimatedTime,
        score: finalScore,
        level,
        levelScore,
        rating,
        acceptanceRate: Math.round(acceptanceRate * 100),
        totalTrips,
      });
    }

    // Sort by score (highest first)
    driverScores.sort((a, b) => b.score - a.score);

    // Apply smart matching logic based on trip type
    const isEmergency = tripType && (tripType.toLowerCase() === "emergency" || tripType.toLowerCase().includes("emergency"));
    let bestMatch = driverScores[0];

    if (driverScores.length > 1) {
      const topDriver = driverScores[0];

      if (isEmergency) {
        // For emergency: prioritize closest driver, but still consider level if very close
        // If multiple drivers are within 1km, prefer higher level
        const veryCloseDrivers = driverScores.filter(d => d.distance <= 1);
        if (veryCloseDrivers.length > 0) {
          // Among very close drivers, prefer Diamond > Gold > Silver
          const sortedByLevel = veryCloseDrivers.sort((a, b) => {
            const levelOrder: Record<string, number> = { Diamond: 3, Gold: 2, Silver: 1 };
            return (levelOrder[b.level] || 0) - (levelOrder[a.level] || 0);
          });
          bestMatch = sortedByLevel[0];
        } else {
          // No very close drivers, use closest available
          bestMatch = topDriver;
        }
      } else {
        // Standard trip logic: balance proximity with quality
        // If top driver is very close (< 1.5km) and has good rating (>= 4.5), prioritize them
        if (topDriver.distance < 1.5 && topDriver.rating >= 4.5) {
          bestMatch = topDriver;
        } else {
          // Check if a higher-level driver is reasonably close
          for (const candidate of driverScores) {
            if (
              candidate.level === "Diamond" &&
              candidate.distance <= topDriver.distance * 1.5 &&
              candidate.rating >= topDriver.rating - 0.2
            ) {
              bestMatch = candidate;
              break;
            } else if (
              candidate.level === "Gold" &&
              candidate.distance <= topDriver.distance * 1.3 &&
              candidate.rating >= topDriver.rating + 0.3
            ) {
              bestMatch = candidate;
              break;
            }
          }
        }
      }
    }

    return res.json({
      matched: true,
      bestDriver: {
        id: bestMatch.driver.id,
        name: bestMatch.driver.name,
        phone: bestMatch.driver.phone,
        rating: bestMatch.rating,
        level: bestMatch.level,
        distance: bestMatch.distance,
        estimatedTime: bestMatch.estimatedTime,
        acceptanceRate: bestMatch.acceptanceRate,
      },
      alternatives: driverScores
        .filter((d) => d.driver.id !== bestMatch.driver.id)
        .slice(0, 3)
        .map((d) => ({
          id: d.driver.id,
          name: d.driver.name,
          rating: d.rating,
          level: d.level,
          distance: d.distance,
          estimatedTime: d.estimatedTime,
        })),
      allCandidates: driverScores.map((d) => ({
        id: d.driver.id,
        name: d.driver.name,
        rating: d.rating,
        level: d.level,
        distance: d.distance,
        estimatedTime: d.estimatedTime,
        score: d.score,
      })),
    });
  } catch (err) {
    console.error("Driver matching error:", err);
    return res.status(500).json({ error: "Failed to find matching driver" });
  }
};

router.post("/find", requireAuth as RequestHandler, findBestDriver as RequestHandler);

export default router;

