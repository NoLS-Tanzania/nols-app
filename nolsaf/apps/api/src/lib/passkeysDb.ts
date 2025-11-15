// apps/api/src/lib/passkeysDb.ts
import { prisma } from "@nolsaf/prisma";

export interface StoredPasskey {
  id?: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  transports?: string[];
  signCount?: number;
  createdAt?: Date;
}

export async function createPasskey(data: StoredPasskey) {
  // If your User.id is Int change the type in schema.prisma and adjust here
  return (prisma as any).passkey.create({
    data: {
      userId: data.userId,
      credentialId: data.credentialId,
      publicKey: data.publicKey,
      transports: data.transports ?? [],
      signCount: data.signCount ?? 0,
    },
  });
}

export async function getPasskeyByCredentialId(credentialId: string) {
  return (prisma as any).passkey.findUnique({ where: { credentialId } });
}

export async function listPasskeysForUser(userId: string) {
  return (prisma as any).passkey.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
}

export async function updatePasskeySignCount(credentialId: string, signCount: number) {
  return (prisma as any).passkey.update({ where: { credentialId }, data: { signCount } });
}

export async function deletePasskey(credentialId: string) {
  return (prisma as any).passkey.delete({ where: { credentialId } });
}

export default {
  createPasskey,
  getPasskeyByCredentialId,
  listPasskeysForUser,
  updatePasskeySignCount,
  deletePasskey,
};
