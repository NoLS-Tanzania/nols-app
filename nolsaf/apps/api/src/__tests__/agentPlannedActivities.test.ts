import { describe, it, expect } from "vitest";
import { extractPlannedActivities } from "../lib/agentPlannedActivities.js";

describe("extractPlannedActivities", () => {
  it("extracts day-by-day timeline with explicit times from packageSnapshot itinerary", () => {
    const packageSnapshot = {
      itinerary: [
        {
          day: 1,
          title: "Game Driving Serengeti",
          description: "Day one description",
          timeline: [
            { time: "07:00 - 08:00", label: "Breakfast" },
            { time: "09:00 - 10:00", label: "Lunch" },
          ],
        },
      ],
    };

    const text = extractPlannedActivities(null, packageSnapshot);

    expect(text).toContain("DAY 1: Game Driving Serengeti");
    expect(text).toContain("07:00 - 08:00 Breakfast");
    expect(text).toContain("09:00 - 10:00 Lunch");
  });

  it("prefers agreedPlan.activities over weaker fallbacks", () => {
    const metadata = {
      agreedPlan: {
        activities: [
          { startTime: "11:00", endTime: "13:00", activity: "Site visit" },
        ],
      },
      activities: ["Fallback activity"],
    };

    const text = extractPlannedActivities(metadata, null);

    expect(text).toContain("11:00-13:00 Site visit");
    expect(text).not.toContain("Fallback activity");
  });

  it("supports selectedPackage.itinerary nested shape", () => {
    const packageSnapshot = {
      selectedPackage: {
        itinerary: [
          {
            day: 2,
            title: "Game Reserve Visit",
            events: [
              { startTime: "10:00", endTime: "12:00", activity: "Play Golf" },
            ],
          },
        ],
      },
    };

    const text = extractPlannedActivities(null, packageSnapshot);

    expect(text).toContain("DAY 2: Game Reserve Visit");
    expect(text).toContain("10:00-12:00 Play Golf");
  });
});
