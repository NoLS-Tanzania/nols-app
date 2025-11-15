// apps/api/src/lib/webauthnUtils.ts
export function bufferToBase64Url(buffer: ArrayBuffer | Uint8Array) {
  const u8 = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer as ArrayBuffer);
  return Buffer.from(u8).toString("base64url");
}

export function base64urlToBuffer(base64url: string) {
  return Buffer.from(base64url, "base64url");
}

export default { bufferToBase64Url, base64urlToBuffer };
