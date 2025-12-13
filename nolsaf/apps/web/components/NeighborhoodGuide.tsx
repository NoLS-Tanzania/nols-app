"use client";

import { MapPin, UtensilsCrossed, Building2, Car, ShoppingBag, Coffee, Camera, Mountain, Heart } from "lucide-react";
import { motion } from "framer-motion";

interface NeighborhoodGuideProps {
  location: {
    regionName?: string;
    district?: string;
    city?: string;
    lat?: number;
    lng?: number;
  };
}

export default function NeighborhoodGuide({ location }: NeighborhoodGuideProps) {
  // Mock neighborhood data - in production, this would come from an API or database
  const neighborhoodData = {
    description: `Located in the heart of ${location.district || location.regionName || "the region"}, this area offers a perfect blend of convenience and tranquility. The neighborhood is known for its friendly locals, vibrant culture, and easy access to major attractions.`,
    highlights: [
      {
        icon: UtensilsCrossed,
        title: "Dining & Nightlife",
        items: [
          "Local restaurants within 200m",
          "Traditional Tanzanian cuisine",
          "International dining options",
          "Cafes and bars nearby",
        ],
      },
      {
        icon: Building2,
        title: "Attractions",
        items: [
          "Historical sites within 5km",
          "Cultural centers",
          "Museums and galleries",
          "Local markets",
        ],
      },
      {
        icon: Car,
        title: "Transportation",
        items: [
          "Public transport nearby",
          "Taxi services available",
          "Walking distance to main areas",
          "Airport access: 30-45 min",
        ],
      },
      {
        icon: ShoppingBag,
        title: "Shopping",
        items: [
          "Local markets within 1km",
          "Supermarkets nearby",
          "Souvenir shops",
          "Convenience stores",
        ],
      },
      {
        icon: Coffee,
        title: "Daily Life",
        items: [
          "Banks and ATMs nearby",
          "Medical facilities within 3km",
          "Schools in the area",
          "Parks and recreation",
        ],
      },
      {
        icon: Camera,
        title: "Photo Spots",
        items: [
          "Scenic viewpoints",
          "Cultural landmarks",
          "Natural beauty spots",
          "Sunset viewing areas",
        ],
      },
    ],
    nearbyAttractions: [
      {
        name: "Local Market",
        distance: "0.5 km",
        type: "Shopping",
        description: "Vibrant local market with fresh produce and crafts",
      },
      {
        name: "Cultural Center",
        distance: "1.2 km",
        type: "Culture",
        description: "Experience local traditions and performances",
      },
      {
        name: "Nature Reserve",
        distance: "3.5 km",
        type: "Nature",
        description: "Beautiful natural area for hiking and wildlife",
      },
      {
        name: "Beach Access",
        distance: "5.0 km",
        type: "Recreation",
        description: "Public beach with stunning ocean views",
      },
    ],
    safety: {
      rating: "Safe",
      description: "This is a well-established neighborhood with good security and friendly locals. The area is well-lit at night and has regular police patrols.",
      tips: [
        "Standard safety precautions recommended",
        "Well-lit streets",
        "Local community is welcoming",
        "Emergency services nearby",
      ],
    },
    localInsights: [
      "Best time to visit local markets: Early morning (6-9 AM)",
      "Weekend cultural events are common in this area",
      "Local restaurants offer authentic Tanzanian dishes",
      "Public transport is reliable and affordable",
      "English is widely spoken in tourist areas",
    ],
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="border-b border-gray-200 pb-10"
    >
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Neighborhood Guide</h2>

      {/* Description */}
      <p className="text-gray-700 leading-relaxed mb-8 text-base">
        {neighborhoodData.description}
      </p>

      {/* Highlights Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {neighborhoodData.highlights.map((highlight, idx) => {
          const Icon = highlight.icon;
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: idx * 0.1 }}
              className="bg-gray-50 rounded-xl p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-emerald-100 rounded-lg flex items-center justify-center">
                  <Icon className="h-5 w-5 text-emerald-600" />
                </div>
                <h3 className="font-semibold text-gray-900">{highlight.title}</h3>
              </div>
              <ul className="space-y-2">
                {highlight.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-2 text-sm text-gray-600">
                    <span className="text-emerald-600 mt-1">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          );
        })}
      </div>

      {/* Nearby Attractions */}
      <div className="mb-10">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Nearby Attractions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {neighborhoodData.nearbyAttractions.map((attraction, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900 mb-1">{attraction.name}</h4>
                  <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    <span>{attraction.distance} away</span>
                    <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-xs font-medium">
                      {attraction.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{attraction.description}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Safety Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-8">
        <div className="flex items-start gap-3 mb-3">
          <Heart className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Safety & Local Insights</h3>
            <p className="text-blue-800 mb-4">{neighborhoodData.safety.description}</p>
            <div className="space-y-2">
              {neighborhoodData.safety.tips.map((tip, idx) => (
                <div key={idx} className="flex items-start gap-2 text-sm text-blue-700">
                  <span className="text-blue-600 mt-1">✓</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Local Insights */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 mb-4">Local Insights</h3>
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
          <ul className="space-y-3">
            {neighborhoodData.localInsights.map((insight, idx) => (
              <motion.li
                key={idx}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.1 }}
                className="flex items-start gap-3 text-sm text-amber-900"
              >
                <Mountain className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <span>{insight}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </div>
    </motion.section>
  );
}
