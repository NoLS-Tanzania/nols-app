import { Router } from "express";
import { prisma } from "@nolsaf/prisma";
import { Prisma } from "@prisma/client";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

/**
 * GET /api/public/tourism-sites?country=Tanzania
 * Lightweight endpoint to power dropdowns and client-side filtering.
 */
const listTourismSites = async (req: any, res: any) => {
  const rawCountry = String((req.query as any)?.country ?? "").trim();
  const country = rawCountry || "Tanzania";
  const useAllCountries = rawCountry.toLowerCase() === "all";

  try {
    const items = await prisma.tourismSite.findMany({
      where: useAllCountries ? undefined : { country },
      orderBy: useAllCountries ? [{ country: "asc" }, { name: "asc" }] : [{ name: "asc" }],
      select: {
        id: true,
        slug: true,
        name: true,
        country: true,
      },
    });

    return res.json({ items });
  } catch (err: any) {
    // If the DB migrations haven't been applied yet, Prisma will throw for missing table/columns.
    // Keep this endpoint non-fatal so the web app can still load.
    if (err instanceof Prisma.PrismaClientKnownRequestError && (err.code === "P2021" || err.code === "P2022")) {
      return res.json({ items: [] });
    }
    throw err;
  }
};

router.get("/", asyncHandler(listTourismSites));

export default router;
