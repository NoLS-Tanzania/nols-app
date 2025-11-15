// apps/api/src/lib/qr.ts
import QRCode from "qrcode";

/** Returns PNG buffer and the payload you encoded */
export async function makeQR(payload: string) {
  const png = await QRCode.toBuffer(payload, { type: "png", margin: 1, scale: 5 });
  return { png, payload };
}
