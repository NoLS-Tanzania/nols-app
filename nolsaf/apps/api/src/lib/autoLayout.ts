import { prisma } from "@nolsaf/prisma";
import { Layout, TLayout } from "./layoutTypes.js";

type PropertyWithRooms = {
  id: number;
  type: string;         // "HOTEL", "LODGE", etc. (your FE maps to UPPER_UNDERSCORE)
  roomsSpec: any[];     // validated on save
  hotelStar?: string | null;
  totalFloors?: number | null;
  title: string;
};

function getOrdinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

function floorLabel(floorNumber: number) {
  if (floorNumber === 0) return "Ground";
  return `${floorNumber}${getOrdinal(floorNumber)}`;
}

function deriveFloorsCount(p: PropertyWithRooms): number {
  const explicit = typeof p.totalFloors === "number" && Number.isFinite(p.totalFloors) ? p.totalFloors : null;
  if (explicit && explicit >= 2) return Math.min(10, Math.max(2, Math.floor(explicit)));

  const rooms = Array.isArray(p.roomsSpec) ? p.roomsSpec : [];
  let maxFloor = 0;
  for (const r of rooms) {
    const floors = Array.isArray((r as any)?.floors) ? (r as any).floors : [];
    for (const f of floors) {
      const n = typeof f === "number" ? f : Number(f);
      if (Number.isFinite(n)) maxFloor = Math.max(maxFloor, n);
    }

    const dist = (r as any)?.floorDistribution;
    if (dist && typeof dist === "object") {
      for (const k of Object.keys(dist)) {
        const n = Number(k);
        if (Number.isFinite(n)) maxFloor = Math.max(maxFloor, n);
      }
    }
  }

  if (maxFloor >= 1) return Math.min(10, maxFloor + 1);
  return 1;
}

/**
 * Generate a simple multi-floor schematic based on property type & roomsSpec.
 * - HOTEL template: corridor spine with rooms aligned both sides.
 * - LODGE template: clusters of rooms grouped around lounge/reception.
 */
export async function generateLayoutForProperty(p: PropertyWithRooms): Promise<TLayout> {
  const rooms = Array.isArray(p.roomsSpec) ? p.roomsSpec : [];
  const totalRooms = rooms.reduce((s, r: any) => s + (Number(r.roomsCount) || 0), 0);
  const metric = "cm";
  const version = 1;

  const floorsCount = deriveFloorsCount(p);

  // Basic canvas defaults
  const hotelCanvas = { w: 3000, h: 1600 };  // 30m x 16m
  const lodgeCanvas = { w: 2400, h: 1800 };  // 24m x 18m
  const corridorWidth = 200; // 2m spine
  const roomW = 420;  // 4.2m
  const roomH = 360;  // 3.6m
  const gap = 40;     // spacing

  // Build flattened list of individual rooms: expand roomsCount
  const expanded: Array<{
    id: string;
    type: string;
    name: string;
    pricePerNight: number;
    photos: string[];
    amenities: string[];
    accessible: boolean;
    adults: number;
    children: number;
    floor: number;
  }> = [];

  // Keep room ids stable + unique even if roomsSpec has repeated roomType entries.
  const nextIndexByRoomType: Record<string, number> = {};

  for (const r of rooms) {
    const count = Number(r.roomsCount) || 0;
    const roomType = String(r.roomType ?? "Room").trim() || "Room";

    // Determine which floors these rooms should live on.
    // Expecting: r.floorDistribution = { 0: 2, 1: 4, ... } from the owner add flow.
    const floorAssignments: number[] = [];
    const dist = (r as any)?.floorDistribution;
    if (dist && typeof dist === "object") {
      const entries = Object.entries(dist)
        .map(([k, v]) => ({ floor: Number(k), n: Number(v) }))
        .filter((x) => Number.isFinite(x.floor) && Number.isFinite(x.n) && x.n > 0)
        .sort((a, b) => a.floor - b.floor);

      for (const e of entries) {
        for (let i = 0; i < e.n; i++) floorAssignments.push(e.floor);
      }
    }

    // Fallback: if distribution missing/invalid, put everything on ground.
    // If distribution exists but doesn't match count, pad/trim to keep stable generation.
    while (floorAssignments.length < count) floorAssignments.push(0);
    if (floorAssignments.length > count) floorAssignments.length = count;

    for (let i=1;i<=count;i++){
      const nextIndex = (nextIndexByRoomType[roomType] ?? 0) + 1;
      nextIndexByRoomType[roomType] = nextIndex;
      const rid = `${roomType}-${nextIndex}`;
      expanded.push({
        id: rid,
        type: "GuestRoom",
        name: roomType + " " + nextIndex,
        pricePerNight: Number(r.pricePerNight || 0),
        photos: Array.isArray(r.roomImages) ? r.roomImages : [],
        amenities: [
          ...(Array.isArray(r.bathItems)? r.bathItems : []),
          ...(Array.isArray(r.otherAmenities)? r.otherAmenities : [])
        ],
        accessible: r.bathPrivate === "yes" ? true : false, // naive heuristic
        adults: 2,
        children: 0,
        floor: Number.isFinite(floorAssignments[i - 1]) ? Math.max(0, Math.floor(floorAssignments[i - 1])) : 0
      });
    }
  }

  if ((p.type ?? "").includes("HOTEL")) {
    // HOTEL: corridor spine, two rows of rooms (multi-floor if needed)
    const corridorX = Math.floor(hotelCanvas.w / 2 - corridorWidth / 2);
    const startXLeft = corridorX - gap - roomW;
    const startXRight = corridorX + corridorWidth + gap;
    const startY = 100;

    const floors: TLayout["floors"] = [];
    const connections: TLayout["connections"] = [];

    for (let floorNumber = 0; floorNumber < floorsCount; floorNumber++) {
      const floorId = floorNumber === 0 ? "floor_g" : `floor_${floorNumber}`;
      const floorRooms = expanded.filter((r) => r.floor === floorNumber);
      const roomsPerSide = Math.ceil(floorRooms.length / 2);
      const roomsLeft = floorRooms.slice(0, roomsPerSide);
      const roomsRight = floorRooms.slice(roomsPerSide);

      const roomsNodes = [
        ...roomsLeft.map((r, idx) => ({
          id: r.id,
          type: r.type,
          name: r.name,
          pos: { x: startXLeft - Math.floor(idx / 8) * (roomW + gap), y: startY + (idx % 8) * (roomH + gap) },
          size: { w: roomW, h: roomH },
          doors: [
            {
              x: startXLeft + roomW,
              y: startY + (idx % 8) * (roomH + gap) + Math.floor(roomH / 2),
              dir: "E" as const,
            },
          ],
          amenities: r.amenities,
          capacity: { adults: r.adults, children: r.children },
          photos: r.photos,
          pricePerNight: r.pricePerNight,
          accessible: r.accessible,
          code: r.id,
        })),
        ...roomsRight.map((r, idx) => ({
          id: r.id,
          type: r.type,
          name: r.name,
          pos: { x: startXRight + Math.floor(idx / 8) * (roomW + gap), y: startY + (idx % 8) * (roomH + gap) },
          size: { w: roomW, h: roomH },
          doors: [
            {
              x: startXRight,
              y: startY + (idx % 8) * (roomH + gap) + Math.floor(roomH / 2),
              dir: "W" as const,
            },
          ],
          amenities: r.amenities,
          capacity: { adults: r.adults, children: r.children },
          photos: r.photos,
          pricePerNight: r.pricePerNight,
          accessible: r.accessible,
          code: r.id,
        })),
      ];

      const corridor = {
        id: `COR_${floorNumber}`,
        type: "Corridor",
        name: "Main Corridor",
        pos: { x: corridorX, y: 60 },
        size: { w: corridorWidth, h: hotelCanvas.h - 120 },
      };

      const stair = {
        id: `STAIR_${floorNumber}`,
        type: "Stair",
        name: "Stairs",
        pos: { x: Math.max(60, corridorX - 300), y: 320 },
        size: { w: 260, h: 240 },
      };

      const spaces = [corridor, stair];
      if (floorNumber === 0) {
        spaces.push({
          id: "REC",
          type: "Reception",
          name: "Reception",
          pos: { x: Math.max(60, corridorX - 300), y: 60 },
          size: { w: 300, h: 220 },
        });
      }

      const edges = roomsNodes.map((r) => ({ from: r.id, to: corridor.id }));

      floors.push({
        id: floorId,
        label: floorLabel(floorNumber),
        size: { w: hotelCanvas.w, h: hotelCanvas.h },
        rooms: roomsNodes,
        spaces,
        edges,
      });

      if (floorNumber > 0) {
        const prevFloorId = floorNumber === 1 ? "floor_g" : `floor_${floorNumber - 1}`;
        connections.push({
          type: "Stair",
          from: { floor: prevFloorId, space: `STAIR_${floorNumber - 1}` },
          to: { floor: floorId, space: `STAIR_${floorNumber}` },
        });
      }
    }

    const layout: TLayout = Layout.parse({
      version,
      metric,
      entrances: [{ floor: "floor_g", space: "REC" }],
      floors,
      connections,
    });

    return layout;
  }

  // Default/LODGE: clusters around reception/lounge (multi-floor if needed)
  const canvas = lodgeCanvas;
  const startX = 80;
  const startY = 360; // keep top free for reception/lounge

  const floors: TLayout["floors"] = [];
  const connections: TLayout["connections"] = [];

  for (let floorNumber = 0; floorNumber < floorsCount; floorNumber++) {
    const floorId = floorNumber === 0 ? "floor_g" : `floor_${floorNumber}`;
    const floorRooms = expanded.filter((r) => r.floor === floorNumber);
    const clusterCols = Math.max(1, Math.ceil(Math.sqrt(Math.max(1, floorRooms.length))));

    const roomsNodes = floorRooms.map((r, idx) => {
      const row = Math.floor(idx / clusterCols);
      const col = idx % clusterCols;
      const x = startX + col * (roomW + gap);
      const y = startY + row * (roomH + gap);
      return {
        id: r.id,
        type: r.type,
        name: r.name,
        pos: { x, y },
        size: { w: roomW, h: roomH },
        doors: [{ x: x + Math.floor(roomW / 2), y, dir: "N" as const }],
        amenities: r.amenities,
        capacity: { adults: r.adults, children: r.children },
        photos: r.photos,
        pricePerNight: r.pricePerNight,
        accessible: r.accessible,
        code: r.id,
      };
    });

    const stair = {
      id: `STAIR_${floorNumber}`,
      type: "Stair",
      name: "Stairs",
      pos: { x: 80, y: 60 },
      size: { w: 320, h: 240 },
    };

    const spaces: any[] = [stair];
    const edges: any[] = [];

    if (floorNumber === 0) {
      const reception = {
        id: "REC",
        type: "Reception",
        name: "Reception",
        pos: { x: 80, y: 60 },
        size: { w: 360, h: 240 },
      };
      const lounge = {
        id: "LOU",
        type: "Lounge",
        name: "Lounge",
        pos: { x: 480, y: 60 },
        size: { w: 420, h: 240 },
      };
      spaces.push(reception, lounge);
      edges.push(...roomsNodes.map((r) => ({ from: r.id, to: lounge.id })), { from: "LOU", to: "REC" });
    } else {
      edges.push(...roomsNodes.map((r) => ({ from: r.id, to: stair.id })));
    }

    floors.push({
      id: floorId,
      label: floorLabel(floorNumber),
      size: { w: canvas.w, h: canvas.h },
      rooms: roomsNodes,
      spaces,
      edges,
    });

    if (floorNumber > 0) {
      const prevFloorId = floorNumber === 1 ? "floor_g" : `floor_${floorNumber - 1}`;
      connections.push({
        type: "Stair",
        from: { floor: prevFloorId, space: `STAIR_${floorNumber - 1}` },
        to: { floor: floorId, space: `STAIR_${floorNumber}` },
      });
    }
  }

  const layout: TLayout = Layout.parse({
    version,
    metric,
    entrances: [{ floor: "floor_g", space: "REC" }],
    floors,
    connections,
  });

  return layout;
}

/** Helper: compute and persist a fresh layout for property id */
export async function regenerateAndSaveLayout(propertyId: number) {
  const p = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, type: true, roomsSpec: true, hotelStar: true, totalFloors: true, title: true }
  });
  if (!p) throw new Error("Property not found");

  const layout = await generateLayoutForProperty(p as any);
  await prisma.property.update({ where: { id: propertyId }, data: { layout } });
  return layout;
}
