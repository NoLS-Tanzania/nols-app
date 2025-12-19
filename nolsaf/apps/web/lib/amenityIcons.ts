/**
 * SHARED ICON MAPPINGS FOR AMENITIES AND BATHROOM ITEMS
 * 
 * This is the SINGLE SOURCE OF TRUTH for icon mappings.
 * All views (owner, public, admin) MUST use these exact mappings
 * to ensure consistency with what owners submit.
 * 
 * PRINCIPLE: Public and admin views are PROHIBITED from using
 * different icons than those defined here (which match owner submissions).
 */

import type { ComponentType } from "react";
import {
  Sparkles,
  ScrollText,
  ShowerHead,
  Flame,
  Toilet as ToiletIcon,
  Wind,
  Trash2,
  Brush,
  ScanFace,
  FootprintsIcon,
  Shirt,
  RectangleHorizontal,
  Waves,
  Wifi,
  Table2,
  Armchair,
  CircleDot,
  Tv,
  MonitorPlay,
  Gamepad2,
  AirVent,
  Refrigerator,
  Coffee,
  Phone,
  LampDesk,
  Heater,
  LockKeyhole,
  Eclipse,
  Sofa,
} from "lucide-react";

/**
 * Icon mapping for bathroom items.
 * These icons are what owners see and select when adding properties.
 * Public and admin views MUST use these exact same icons.
 */
export const BATHROOM_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "Free toiletries": Sparkles,
  "Toilet paper": ScrollText,
  "Shower": ShowerHead,
  "Water Heater": Flame,
  "Toilet": ToiletIcon,
  "Hairdryer": Wind,
  "Trash Bin": Trash2,
  "Toilet Brush": Brush,
  "Mirror": ScanFace,
  "Slippers": FootprintsIcon,
  "Bathrobe": Shirt,
  "Bath Mat": RectangleHorizontal,
  "Towel": Waves,
};

/**
 * Icon mapping for other room amenities.
 * These icons are what owners see and select when adding properties.
 * Public and admin views MUST use these exact same icons.
 */
export const OTHER_AMENITIES_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  "Free Wi-Fi": Wifi,
  "Table": Table2,
  "Chair": Armchair,
  "Iron": CircleDot,
  "TV": Tv,
  "Flat Screen TV": MonitorPlay,
  "PS Station": Gamepad2,
  "Wardrobe": Shirt,
  "Air Conditioning": AirVent,
  "Mini Fridge": Refrigerator,
  "Coffee Maker": Coffee,
  "Phone": Phone,
  "Mirror": ScanFace,
  "Bedside Lamps": LampDesk,
  "Heating": Heater,
  "Desk": Table2,
  "Safe": LockKeyhole,
  "Clothes Rack": Shirt,
  "Blackout Curtains": Eclipse,
  "Couches": Sofa,
};
