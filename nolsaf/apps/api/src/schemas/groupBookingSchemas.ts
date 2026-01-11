/**
 * @fileoverview Validation schemas for Group Booking operations
 * @module schemas/groupBookingSchemas
 * 
 * Defines Zod validation schemas for creating and managing group bookings.
 * These schemas ensure data integrity and provide type safety for API endpoints.
 */

import { z } from "zod";

/**
 * Valid group types for group bookings
 */
export const GROUP_TYPES = [
  "family",
  "workers", 
  "event",
  "students",
  "team",
  "safari_stay",
  "other"
] as const;

/**
 * Valid accommodation types
 */
export const ACCOMMODATION_TYPES = [
  "villa",
  "apartment",
  "hotel",
  "hostel",
  "lodge",
  "condo",
  "guest_house",
  "bungalow",
  "cabin",
  "homestay",
  "townhouse",
  "house",
  "dorm",
  "other"
] as const;

/**
 * Valid booking statuses
 */
export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "PROCESSING",
  "CANCELED",
  "COMPLETED"
] as const;

/**
 * Schema for individual passenger within a roster
 */
export const PassengerSchema = z.object({
  firstname: z.string().min(1, "First name is required").max(100),
  lastname: z.string().min(1, "Last name is required").max(100),
  phone: z.string().max(20).optional(),
  age: z.string().max(3).optional(),
  gender: z.string().max(20).optional(),
  nationality: z.string().max(100).optional(),
});

/**
 * Schema for arrangement details
 */
export const ArrangementSchema = z.object({
  pickup: z.boolean().default(false),
  transport: z.boolean().default(false),
  meals: z.boolean().default(false),
  guide: z.boolean().default(false),
  equipment: z.boolean().default(false),
  pickupLocation: z.string().max(500).nullable().optional(),
  pickupTime: z.string().max(20).nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
});

/**
 * Main schema for creating a new group booking
 * 
 * Validates all required and optional fields for group accommodation requests.
 * Enforces business rules such as minimum headcount, date logic, and private room constraints.
 */
export const CreateGroupBookingInput = z.object({
  // ==================== Group Details ====================
  groupType: z.enum(GROUP_TYPES, {
    errorMap: () => ({ message: "Invalid group type" })
  }),
  
  // ==================== Origin (Optional) ====================
  fromCountry: z.string().max(100).optional().nullable(),
  fromRegion: z.string().max(100).optional().nullable(),
  fromDistrict: z.string().max(100).optional().nullable(),
  fromWard: z.string().max(100).optional().nullable(),
  fromLocation: z.string().max(500).optional().nullable(),
  
  // ==================== Destination (Required) ====================
  toRegion: z.string().min(1, "Destination region is required").max(100),
  toDistrict: z.string().max(100).optional().nullable(),
  toWard: z.string().max(100).optional().nullable(),
  toLocation: z.string().max(500).optional().nullable(),
  
  // ==================== Accommodation ====================
  accommodationType: z.string().min(1, "Accommodation type is required").max(50),
  headcount: z.number().int().min(1, "Headcount must be at least 1").max(1000, "Headcount cannot exceed 1000"),
  maleCount: z.number().int().min(0).max(1000).optional().nullable(),
  femaleCount: z.number().int().min(0).max(1000).optional().nullable(),
  otherCount: z.number().int().min(0).max(1000).optional().nullable(),
  roomSize: z.number().int().min(1, "Room size must be at least 1").max(10, "Room size cannot exceed 10"),
  roomsNeeded: z.number().int().min(1, "At least one room is required"),
  needsPrivateRoom: z.boolean().default(false),
  privateRoomCount: z.number().int().min(0).max(100).default(0),
  
  // ==================== Dates ====================
  checkin: z.string().datetime().nullable().optional(),
  checkout: z.string().datetime().nullable().optional(),
  useDates: z.boolean().default(true).optional(),
  
  // ==================== Arrangements ====================
  arrangements: ArrangementSchema,
  
  // ==================== Roster ====================
  roster: z.array(PassengerSchema).default([]),
})
  // Custom refinement: validate private room logic
  .refine(
    (data) => {
      if (data.needsPrivateRoom) {
        return data.privateRoomCount > 0;
      }
      return true;
    },
    {
      message: "Private room count must be greater than 0 when private rooms are needed",
      path: ["privateRoomCount"],
    }
  )
  // Custom refinement: validate date logic
  .refine(
    (data) => {
      if (data.useDates && data.checkin && data.checkout) {
        const checkInDate = new Date(data.checkin);
        const checkOutDate = new Date(data.checkout);
        return checkOutDate > checkInDate;
      }
      return true;
    },
    {
      message: "Check-out date must be after check-in date",
      path: ["checkout"],
    }
  )
  // Custom refinement: validate dates are in the future
  .refine(
    (data) => {
      if (data.useDates && data.checkin) {
        const checkInDate = new Date(data.checkin);
        const now = new Date();
        return checkInDate >= now;
      }
      return true;
    },
    {
      message: "Check-in date cannot be in the past",
      path: ["checkin"],
    }
  )
  // Custom refinement: validate gender breakdown sums to headcount
  .refine(
    (data) => {
      if (data.maleCount !== undefined || data.femaleCount !== undefined || data.otherCount !== undefined) {
        const genderSum = (data.maleCount || 0) + (data.femaleCount || 0) + (data.otherCount || 0);
        return genderSum === data.headcount;
      }
      return true;
    },
    {
      message: "Gender breakdown (male + female + other) must equal total headcount",
      path: ["headcount"],
    }
  );

/**
 * Schema for updating group booking status
 */
export const UpdateGroupBookingStatusInput = z.object({
  status: z.enum(BOOKING_STATUSES),
  adminNotes: z.string().max(2000).optional().nullable(),
  cancelReason: z.string().max(2000).optional().nullable(),
});

/**
 * Schema for updating group booking details
 * Note: Partial updates without the complex refinements
 */
export const UpdateGroupBookingInput = z.object({
  id: z.number().int().positive(),
  groupType: z.enum(GROUP_TYPES).optional(),
  fromRegion: z.string().max(100).optional().nullable(),
  fromDistrict: z.string().max(100).optional().nullable(),
  fromWard: z.string().max(100).optional().nullable(),
  fromLocation: z.string().max(500).optional().nullable(),
  toRegion: z.string().min(1).max(100).optional(),
  toDistrict: z.string().max(100).optional().nullable(),
  toWard: z.string().max(100).optional().nullable(),
  toLocation: z.string().max(500).optional().nullable(),
  accommodationType: z.string().min(1).max(50).optional(),
  headcount: z.number().int().min(1).max(1000).optional(),
  roomSize: z.number().int().min(1).max(10).optional(),
  roomsNeeded: z.number().int().min(1).optional(),
  needsPrivateRoom: z.boolean().optional(),
  privateRoomCount: z.number().int().min(0).max(100).optional(),
  checkin: z.string().datetime().nullable().optional(),
  checkout: z.string().datetime().nullable().optional(),
  useDates: z.boolean().optional(),
  arrangements: ArrangementSchema.optional(),
});

/**
 * Schema for querying/filtering group bookings
 */
export const GroupBookingQueryInput = z.object({
  status: z.enum(BOOKING_STATUSES).optional(),
  groupType: z.enum(GROUP_TYPES).optional(),
  userId: z.number().int().positive().optional(),
  region: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
  page: z.number().int().positive().default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

// ==================== Type Exports ====================

export type CreateGroupBookingInput = z.infer<typeof CreateGroupBookingInput>;
export type UpdateGroupBookingStatusInput = z.infer<typeof UpdateGroupBookingStatusInput>;
export type UpdateGroupBookingInput = z.infer<typeof UpdateGroupBookingInput>;
export type GroupBookingQueryInput = z.infer<typeof GroupBookingQueryInput>;
export type PassengerInput = z.infer<typeof PassengerSchema>;
export type ArrangementInput = z.infer<typeof ArrangementSchema>;
