import jwt, { type Algorithm } from "jsonwebtoken";

export type PropertyVerificationTokenPayload = {
  typ: "PROPERTY_VERIFICATION";
  propertyId: number;
  verificationId: number;
};

const ISSUER = "nolsaf-property-verification";
const ALGS: Algorithm[] = ["HS256"];
const MAX_TOKEN_LENGTH = 2048;

function getSecret(): string {
  const secret =
    process.env.PUBLIC_LINK_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    (process.env.NODE_ENV !== "production" ? process.env.DEV_JWT_SECRET || "dev_jwt_secret" : "");

  if (!secret) {
    throw new Error("property_verification_secret_missing");
  }

  return secret;
}

export function signPropertyVerificationToken(propertyId: number, verificationId: number): string {
  return jwt.sign(
    {
      typ: "PROPERTY_VERIFICATION",
      propertyId,
      verificationId,
    } satisfies PropertyVerificationTokenPayload,
    getSecret(),
    { issuer: ISSUER, algorithm: "HS256" }
  );
}

export function verifyPropertyVerificationToken(token: string): PropertyVerificationTokenPayload | null {
  try {
    if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return null;
    const decoded = jwt.verify(token, getSecret(), { issuer: ISSUER, algorithms: ALGS }) as PropertyVerificationTokenPayload;
    if (decoded?.typ !== "PROPERTY_VERIFICATION") return null;
    if (!Number.isFinite(Number(decoded.propertyId)) || !Number.isFinite(Number(decoded.verificationId))) return null;
    return {
      typ: "PROPERTY_VERIFICATION",
      propertyId: Number(decoded.propertyId),
      verificationId: Number(decoded.verificationId),
    };
  } catch {
    return null;
  }
}
