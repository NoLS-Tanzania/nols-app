import { Router } from 'express';
import { prisma } from '@nolsaf/prisma';
import { hashPassword } from '../lib/crypto.js';

const router = Router();

router.post('/login', (req, res) => {
  const { email } = req.body;
  // Dummy token
  return res.json({ token: `fake.${Buffer.from(email ?? 'user').toString('base64')}.token`, role: 'USER' });
});

/**
 * POST /api/auth/register
 * Body: { email, name?, phone?, password?, role?: 'USER'|'OWNER'|'DRIVER' }
 * NOTE: ADMIN creation is explicitly forbidden here. This endpoint attempts to create a real user via Prisma, but
 * falls back to a safe stub response if the database/schema isn't ready (local dev mode).
 */
router.post('/register', async (req, res) => {
  const { email, name, phone, password, role } = req.body as any;
  const desiredRole = (role || 'USER').toUpperCase();

  const allowed = ['USER', 'OWNER', 'DRIVER'];
  if (!allowed.includes(desiredRole)) return res.status(400).json({ error: 'invalid role' });

  // For safety, never allow creating ADMIN via this public endpoint
  if (desiredRole === 'ADMIN') return res.status(403).json({ error: 'cannot create admin via public registration' });

  // Try to create a real user if Prisma is available and DB schema matches; otherwise fallback to stub
  try {
    const pwHash = password ? await hashPassword(String(password)) : null;
    const created = await prisma.user.create({
      data: {
        email: String(email),
        name: name ?? null,
        phone: phone ?? null,
        role: desiredRole,
        passwordHash: pwHash ?? null,
      } as any,
      select: { id: true, email: true }
    });
    return res.status(201).json({ id: created.id, email: created.email, role: desiredRole });
  } catch (err) {
    // If Prisma fails (missing schema/enum), log and return a safe response so the public UI can continue working in dev.
    console.warn('Prisma create failed in /api/auth/register (falling back to stub):', err);
    return res.status(201).json({ id: null, email: String(email), role: desiredRole, warning: 'created-stub' });
  }
});

export default router;
