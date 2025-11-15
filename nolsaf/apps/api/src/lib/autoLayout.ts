import { prisma } from "@nolsaf/prisma";
import { Layout, TLayout } from "./layoutTypes.js";

type PropertyWithRooms = {
  id: number;
  type: string;         // "HOTEL", "LODGE", etc. (your FE maps to UPPER_UNDERSCORE)
  roomsSpec: any[];     // validated on save
  hotelStar?: string | null;
  title: string;
};

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
  }> = [];

  for (const r of rooms) {
    const count = Number(r.roomsCount) || 0;
    for (let i=1;i<=count;i++){
      const rid = `${r.roomType}-${i}`;
      expanded.push({
        id: rid,
        type: "GuestRoom",
        name: r.roomType + " " + i,
        pricePerNight: Number(r.pricePerNight || 0),
        photos: Array.isArray(r.roomImages) ? r.roomImages : [],
        amenities: [
          ...(Array.isArray(r.bathItems)? r.bathItems : []),
          ...(Array.isArray(r.otherAmenities)? r.otherAmenities : [])
        ],
        accessible: r.bathPrivate === "yes" ? true : false, // naive heuristic
        adults: 2,
        children: 0
      });
    }
  }

  if ((p.type ?? "").includes("HOTEL")) {
    // HOTEL: corridor spine, two rows of rooms
    const floorId = "floor_g";
    const corridorX = Math.floor(hotelCanvas.w/2 - corridorWidth/2);
    const roomsPerSide = Math.ceil(expanded.length / 2);
    const colSpacing = roomW + gap;
    const startXLeft = corridorX - gap - roomW;
    const startXRight = corridorX + corridorWidth + gap;
    const startY = 100;

    const roomsLeft = expanded.slice(0, roomsPerSide);
    const roomsRight = expanded.slice(roomsPerSide);

    const roomsNodes = [
      ...roomsLeft.map((r, idx) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        pos: { x: startXLeft - (Math.floor(idx/8)* (roomW + gap)), y: startY + (idx%8) * (roomH + gap) },
        size: { w: roomW, h: roomH },
        doors: [{ x: startXLeft + roomW, y: startY + (idx%8)*(roomH+gap) + Math.floor(roomH/2), dir: "E" as const }],
        amenities: r.amenities,
        capacity: { adults: r.adults, children: r.children },
        photos: r.photos,
        pricePerNight: r.pricePerNight,
        accessible: r.accessible,
        code: r.id
      })),
      ...roomsRight.map((r, idx) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        pos: { x: startXRight + (Math.floor(idx/8)* (roomW + gap)), y: startY + (idx%8) * (roomH + gap) },
        size: { w: roomW, h: roomH },
        doors: [{ x: startXRight, y: startY + (idx%8)*(roomH+gap) + Math.floor(roomH/2), dir: "W" as const }],
        amenities: r.amenities,
        capacity: { adults: r.adults, children: r.children },
        photos: r.photos,
        pricePerNight: r.pricePerNight,
        accessible: r.accessible,
        code: r.id
      }))
    ];

    const corridor = {
      id: "COR_1",
      type: "Corridor",
      name: "Main Corridor",
      pos: { x: corridorX, y: 60 },
      size: { w: corridorWidth, h: hotelCanvas.h - 120 }
    };

    const reception = {
      id: "REC",
      type: "Reception",
      name: "Reception",
      pos: { x: Math.max(60, corridorX - 300), y: 60 },
      size: { w: 300, h: 220 }
    };

    const edges = roomsNodes.map(r => ({ from: r.id, to: corridor.id }));

    const layout: TLayout = Layout.parse({
      version: 1,
      metric,
      entrances: [{ floor: "floor_g", space: "REC" }],
      floors: [{
        id: floorId,
        label: "Ground",
        size: { w: hotelCanvas.w, h: hotelCanvas.h },
        rooms: roomsNodes,
        spaces: [corridor, reception],
        edges
      }],
      connections: []
    });

    return layout;
  }

  // Default/LODGE: clusters around reception/lounge
  const floorId = "floor_g";
  const canvas = lodgeCanvas;
  const clusterCols = Math.ceil(Math.sqrt(expanded.length));
  const clusterRows = Math.ceil(expanded.length / clusterCols);
  const startX = 80;
  const startY = 360; // keep top free for reception/lounge

  const roomsNodes = expanded.map((r, idx) => {
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
      doors: [{ x: x + Math.floor(roomW/2), y: y, dir: "N" as const }],
      amenities: r.amenities,
      capacity: { adults: r.adults, children: r.children },
      photos: r.photos,
      pricePerNight: r.pricePerNight,
      accessible: r.accessible,
      code: r.id
    };
  });

  const reception = {
    id: "REC",
    type: "Reception",
    name: "Reception",
    pos: { x: 80, y: 60 },
    size: { w: 360, h: 240 }
  };

  const lounge = {
    id: "LOU",
    type: "Lounge",
    name: "Lounge",
    pos: { x: 480, y: 60 },
    size: { w: 420, h: 240 }
  };

  const edges = roomsNodes.map(r => ({ from: r.id, to: lounge.id }));
  edges.push({ from: "LOU", to: "REC" });

  const layout: TLayout = Layout.parse({
    version: 1,
    metric,
    entrances: [{ floor: "floor_g", space: "REC" }],
    floors: [{
      id: floorId,
      label: "Ground",
      size: { w: canvas.w, h: canvas.h },
      rooms: roomsNodes,
      spaces: [reception, lounge],
      edges
    }],
    connections: []
  });

  return layout;
}

/** Helper: compute and persist a fresh layout for property id */
export async function regenerateAndSaveLayout(propertyId: number) {
  const p = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { id: true, type: true, roomsSpec: true, hotelStar: true, title: true }
  });
  if (!p) throw new Error("Property not found");

  const layout = await generateLayoutForProperty(p as any);
  await prisma.property.update({ where: { id: propertyId }, data: { layout } });
  return layout;
}
