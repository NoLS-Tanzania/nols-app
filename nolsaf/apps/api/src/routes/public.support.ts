import { Router } from "express";
import { prisma } from "@nolsaf/prisma";

const router = Router();

// Public endpoint returning support contact info stored in system settings
router.get("/", async (_req, res) => {
  try {
    const s = await prisma.systemSetting.findUnique({ where: { id: 1 } }) ?? {} as any;
    const supportEmail = s.supportEmail ?? process.env.NEXT_PUBLIC_SUPPORT_EMAIL ?? null;
    const supportPhone = s.supportPhone ?? process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? null;
    res.json({ supportEmail, supportPhone });
  } catch (err) {
    console.error('public support error', err);
    res.status(500).json({ error: 'Could not load support contact' });
  }
});

export default router;
