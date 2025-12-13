// Shared in-memory store for updates
// In production, replace this with a database model

export interface Update {
  id: string;
  title: string;
  content: string;
  images?: string[];
  videos?: string[];
  createdAt: string;
  updatedAt: string;
}

// In-memory store
const updatesStore: Record<string, Update> = {};

export function getUpdatesStore(): Record<string, Update> {
  return updatesStore;
}

export function getUpdate(id: string): Update | undefined {
  return updatesStore[id];
}

export function setUpdate(id: string, update: Update): void {
  updatesStore[id] = update;
}

export function deleteUpdate(id: string): void {
  delete updatesStore[id];
}

export function getAllUpdates(): Update[] {
  return Object.values(updatesStore);
}

