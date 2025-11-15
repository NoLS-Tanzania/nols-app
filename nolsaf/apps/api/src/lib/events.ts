type EventName =
  | "property.status.changed"
  | "property.review.note"
  | "property.image.processing"
  | "property.updated.snapshot";

type EventPayload = Record<string, any>;

export async function emitEvent(name: EventName, payload: EventPayload) {
  try {
    // TODO: wire Redis pub/sub or message bus.
    console.log("[event]", name, JSON.stringify(payload));
  } catch {}
}
    // swallow  errors