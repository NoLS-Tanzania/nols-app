import { z } from "zod";

export const DoorDir = z.enum(["N","S","E","W"]);

export const Door = z.object({
  x: z.number().finite(),
  y: z.number().finite(),
  dir: DoorDir
});

export const Rect = z.object({
  w: z.number().positive(),
  h: z.number().positive()
});

export const Pos = z.object({
  x: z.number().finite(),
  y: z.number().finite()
});

export const RoomNode = z.object({
  id: z.string().min(1),
  type: z.string().min(1), // "GuestRoom" | "Suite" | "Dorm" | etc
  name: z.string().min(1),
  pos: Pos,
  size: Rect,
  doors: z.array(Door).max(6).default([]),
  amenities: z.array(z.string()).default([]),
  capacity: z.object({ adults: z.number().int().min(0), children: z.number().int().min(0) }).default({ adults: 2, children: 0 }),
  photos: z.array(z.string().url()).default([]),
  pricePerNight: z.number().nonnegative().default(0),
  accessible: z.boolean().default(false),
  code: z.string().min(1) // links to booking inventory code or room label
});

export const SpaceNode = z.object({
  id: z.string().min(1),
  type: z.string().min(1), // "Reception" | "Corridor" | "Stair" | "Lounge" etc
  name: z.string().optional(),
  pos: Pos,
  size: Rect
});

export const Edge = z.object({
  from: z.string().min(1),
  to: z.string().min(1)
});

export const Floor = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  size: Rect, // canvas size (cm)
  rooms: z.array(RoomNode).default([]),
  spaces: z.array(SpaceNode).default([]),
  edges: z.array(Edge).default([])
});

export const Connection = z.object({
  type: z.enum(["Stair","Lift","External"]),
  from: z.object({ floor: z.string(), space: z.string() }),
  to: z.object({ floor: z.string(), space: z.string() })
});

export const Layout = z.object({
  version: z.literal(1),
  metric: z.literal("cm"),
  entrances: z.array(z.object({ floor: z.string(), space: z.string() })).default([]),
  floors: z.array(Floor).min(1),
  connections: z.array(Connection).default([])
});

export type TLayout = z.infer<typeof Layout>;
