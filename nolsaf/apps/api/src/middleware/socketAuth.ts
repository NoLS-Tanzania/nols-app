// Socket.io authentication middleware
import { Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { prisma } from "@nolsaf/prisma";

export interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      id: number;
      role: string;
      email?: string | null;
    };
  };
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  if (!cookieHeader) return {};
  const out: Record<string, string> = {};
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const k = part.slice(0, idx).trim();
    const v = part.slice(idx + 1).trim();
    if (!k) continue;
    try {
      out[k] = decodeURIComponent(v);
    } catch {
      out[k] = v;
    }
  }
  return out;
}

async function verifyToken(token: string): Promise<{ id: number; role: string; email?: string | null } | null> {
  try {
    const secret =
      process.env.JWT_SECRET ||
      (process.env.NODE_ENV !== "production" ? (process.env.DEV_JWT_SECRET || "dev_jwt_secret") : "");
    if (!secret) {
      return null;
    }

    const decoded = jwt.verify(token, secret) as any;
    if (!decoded || !decoded.sub) {
      return null;
    }

    // Fetch user from DB to get current role (important for role changes)
    const userId = Number(decoded.sub);
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true },
    });

    if (!user) {
      return null;
    }

    // Map role - ensure it's a string and handle CUSTOMER -> USER mapping
    const role = (user.role?.toUpperCase() || 'USER');
    const mappedRole = role === 'CUSTOMER' ? 'USER' : role;

    return {
      id: user.id,
      role: mappedRole,
      email: user.email || null,
    };
  } catch (error) {
    return null;
  }
}

function getTokenFromSocket(socket: Socket): string | null {
  // Try Authorization header first (if sent via handshake)
  const authHeader = socket.handshake.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }

  // Try cookies
  const cookies = parseCookies(socket.handshake.headers.cookie);
  return cookies["nolsaf_token"] || cookies["__Host-nolsaf_token"] || cookies["token"] || null;
}

/**
 * Socket.io authentication middleware
 * Validates JWT token from Authorization header or cookies
 */
export function socketAuthMiddleware(socket: AuthenticatedSocket, next: (err?: Error) => void) {
  const token = getTokenFromSocket(socket);

  if (!token) {
    return next(new Error("Authentication error: No token provided"));
  }

  verifyToken(token)
    .then((user) => {
      if (!user) {
        return next(new Error("Authentication error: Invalid token"));
      }

      // Attach user to socket data
      socket.data.user = user;
      next();
    })
    .catch(() => {
      next(new Error("Authentication error: Token verification failed"));
    });
}

