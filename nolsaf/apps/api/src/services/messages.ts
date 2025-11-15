import { prisma } from "@nolsaf/prisma";

export type MessageDto = {
  id: number | string;
  ownerId: number;
  fromName: string;
  subject: string;
  body?: string | null;
  unread: boolean;
  createdAt: Date;
  meta?: any;
};

export async function fetchOwnerMessages(opts: { ownerId: number, tab?: 'unread' | 'viewed', page?: number, pageSize?: number }) {
  const { ownerId, tab = 'unread', page = 1, pageSize = 20 } = opts;
  try {
    const where: any = { ownerId };
    if (tab === 'unread') where.unread = true;
    else where.unread = false;

    const items = await (prisma as any).message.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize });
    const total = await (prisma as any).message.count({ where });

    const dto: MessageDto[] = items.map((m: any) => ({ id: m.id, ownerId: m.ownerId, fromName: m.fromName, subject: m.subject, body: m.body ?? null, unread: !!m.unread, createdAt: m.createdAt, meta: m.meta ?? null }));
    return { items: dto, total };
  } catch (err: any) {
    console.warn('messages service: falling back to empty list due to error', err?.message ?? err);
    return { items: [] as MessageDto[], total: 0 };
  }
}

export async function markMessageRead(id: number | string, ownerId?: number) {
  try {
    // ensure owner scoping when ownerId provided
    if (ownerId) {
      const found = await (prisma as any).message.findFirst({ where: { id: Number(id), ownerId } });
      if (!found) return { ok: false, error: 'not_found' };
    }
    await (prisma as any).message.update({ where: { id: Number(id) }, data: { unread: false } });
    return { ok: true };
  } catch (err: any) {
    console.warn('markMessageRead failed', err?.message ?? err);
    return { ok: false, error: String(err?.message ?? err) };
  }
}

export async function markMessageUnread(id: number | string, ownerId?: number) {
  try {
    if (ownerId) {
      const found = await (prisma as any).message.findFirst({ where: { id: Number(id), ownerId } });
      if (!found) return { ok: false, error: 'not_found' };
    }
    await (prisma as any).message.update({ where: { id: Number(id) }, data: { unread: true } });
    return { ok: true };
  } catch (err: any) {
    console.warn('markMessageUnread failed', err?.message ?? err);
    return { ok: false, error: String(err?.message ?? err) };
  }
}
