import { Router } from 'express';
import { AuthedRequest, requireAuth, requireRole } from '../middleware/auth.js';
import { prisma } from '@nolsaf/prisma';

const router = Router();
router.use(requireAuth as any, requireRole('DRIVER') as any);

// GET /api/driver/license/meta - Get license metadata (number, expires)
router.get('/meta', (async (req: AuthedRequest, res: any) => {
  try {
    const driverId = req.user!.id;
    
    // First, try to find driver license document
    const licenseDoc = await prisma.userDocument.findFirst({
      where: {
        userId: driverId,
        type: { in: ['DRIVER_LICENSE', 'LICENSE', 'DRIVING_LICENSE', 'DRIVER_LICENCE'] }
      },
      orderBy: { id: 'desc' }
    });

    let number: string | null = null;
    let expires: string | null = null;

    if (licenseDoc) {
      // Extract metadata from document
      const meta = licenseDoc.metadata as any;
      number = meta?.number || meta?.licenseNumber || meta?.license_number || null;
      expires = meta?.expires || meta?.expiresAt || meta?.expirationDate || meta?.expires_at || meta?.expiration_date || null;
    }

    // If not found in document, check if stored in User model (as JSON or direct fields)
    if (!number || !expires) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: driverId },
          select: { payout: true } // Check payout JSON or other JSON fields
        });
        
        // Check if license info is in payout JSON (some drivers might store it there)
        const payout = user?.payout as any;
        if (payout?.licenseNumber && !number) number = payout.licenseNumber;
        if (payout?.licenseExpires && !expires) expires = payout.licenseExpires;
      } catch (e) {
        // Ignore errors
      }
    }

    return res.json({ number, expires });
  } catch (err: any) {
    console.error('GET /api/driver/license/meta failed:', err?.message || err);
    return res.json({ number: null, expires: null });
  }
}) as any);

// GET /api/driver/license - Get full license information (url, number, expires)
router.get('/', (async (req: AuthedRequest, res: any) => {
  try {
    const driverId = req.user!.id;
    
    // Find driver license document
    const licenseDoc = await prisma.userDocument.findFirst({
      where: {
        userId: driverId,
        type: { in: ['DRIVER_LICENSE', 'LICENSE', 'DRIVING_LICENSE'] } // Support multiple type values
      },
      orderBy: { id: 'desc' } // Get most recent
    });

    if (!licenseDoc) {
      return res.json({ url: null, number: null, expires: null });
    }

    // Extract data from document
    const meta = licenseDoc.metadata as any;
    const url = licenseDoc.url || null;
    let number = meta?.number || meta?.licenseNumber || meta?.license_number || null;
    let expires = meta?.expires || meta?.expiresAt || meta?.expirationDate || meta?.expires_at || meta?.expiration_date || null;
    
    // If metadata not found, try User model
    if (!number || !expires) {
      try {
        const user = await prisma.user.findUnique({
          where: { id: driverId },
          select: { payout: true }
        });
        const payout = user?.payout as any;
        if (payout?.licenseNumber && !number) number = payout.licenseNumber;
        if (payout?.licenseExpires && !expires) expires = payout.licenseExpires;
      } catch (e) {
        // Ignore
      }
    }

    return res.json({ url, number, expires });
  } catch (err: any) {
    console.error('GET /api/driver/license failed:', err?.message || err);
    return res.status(500).json({ error: 'Failed to load license' });
  }
}) as any);

export default router;
