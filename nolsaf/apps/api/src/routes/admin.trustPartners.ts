import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import requireRole from "../middleware/auth";

const router = Router();

// Get all trust partners (admin only)
router.get("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const partners = await prisma.trustPartner.findMany({
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
    });
    res.json({ items: partners });
  } catch (err: any) {
    console.error("Failed to fetch trust partners", err);
    res.status(500).json({ error: "Failed to fetch trust partners" });
  }
});

// Get active trust partners (public endpoint)
router.get("/public", async (req, res) => {
  try {
    const partners = await prisma.trustPartner.findMany({
      where: { isActive: true },
      orderBy: [{ displayOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        name: true,
        logoUrl: true,
        href: true,
      },
    });
    res.json({ items: partners });
  } catch (err: any) {
    console.error("Failed to fetch public trust partners", err);
    res.status(500).json({ error: "Failed to fetch trust partners" });
  }
});

// Get single trust partner
router.get("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid partner ID" });
    }
    const partner = await prisma.trustPartner.findUnique({
      where: { id },
    });
    if (!partner) {
      return res.status(404).json({ error: "Trust partner not found" });
    }
    res.json(partner);
  } catch (err: any) {
    console.error("Failed to fetch trust partner", err);
    res.status(500).json({ error: "Failed to fetch trust partner" });
  }
});

// Create new trust partner
router.post("/", requireRole("ADMIN"), async (req, res) => {
  try {
    const { name, logoUrl, href, displayOrder, isActive } = req.body;
    
    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return res.status(400).json({ error: "Name is required" });
    }

    const partner = await prisma.trustPartner.create({
      data: {
        name: name.trim(),
        logoUrl: logoUrl?.trim() || null,
        href: href?.trim() || null,
        displayOrder: displayOrder !== undefined ? parseInt(displayOrder, 10) : 0,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });
    res.status(201).json(partner);
  } catch (err: any) {
    console.error("Failed to create trust partner", err);
    res.status(500).json({ error: "Failed to create trust partner" });
  }
});

// Update trust partner
router.patch("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid partner ID" });
    }

    const { name, logoUrl, href, displayOrder, isActive } = req.body;
    const updateData: any = {};

    if (name !== undefined) {
      if (typeof name !== "string" || name.trim().length === 0) {
        return res.status(400).json({ error: "Name must be a non-empty string" });
      }
      updateData.name = name.trim();
    }

    if (logoUrl !== undefined) {
      updateData.logoUrl = logoUrl?.trim() || null;
    }

    if (href !== undefined) {
      updateData.href = href?.trim() || null;
    }

    if (displayOrder !== undefined) {
      updateData.displayOrder = parseInt(displayOrder, 10);
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const partner = await prisma.trustPartner.update({
      where: { id },
      data: updateData,
    });
    res.json(partner);
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Trust partner not found" });
    }
    console.error("Failed to update trust partner", err);
    res.status(500).json({ error: "Failed to update trust partner" });
  }
});

// Delete trust partner
router.delete("/:id", requireRole("ADMIN"), async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: "Invalid partner ID" });
    }

    await prisma.trustPartner.delete({
      where: { id },
    });
    res.json({ ok: true });
  } catch (err: any) {
    if (err.code === "P2025") {
      return res.status(404).json({ error: "Trust partner not found" });
    }
    console.error("Failed to delete trust partner", err);
    res.status(500).json({ error: "Failed to delete trust partner" });
  }
});

export default router;

