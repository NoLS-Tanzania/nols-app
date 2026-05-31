type AnyRecord = Record<string, unknown>;

function formatActivityObject(value: AnyRecord): string {
  const time = String(value.time || value.startTime || "").trim();
  const endTime = String(value.endTime || "").trim();
  const title = String(value.label || value.activity || value.name || value.title || "").trim();
  const description = String(value.description || value.notes || "").trim();

  const text = title || description;
  if (!text) return "";
  if (time && endTime) return `${time}-${endTime} ${text}`.trim();
  if (time) return `${time} ${text}`.trim();
  return text;
}

function asActivityText(value: unknown): string | null {
  if (typeof value === "string") {
    const text = value.trim();
    return text.length > 0 ? text : null;
  }

  if (Array.isArray(value)) {
    const text = value
      .map((v) => {
        if (typeof v === "string") return v.trim();
        if (v && typeof v === "object" && !Array.isArray(v)) {
          return asActivityText(v as AnyRecord) || "";
        }
        return "";
      })
      .filter((v) => v.length > 0)
      .join("\n");
    return text.length > 0 ? text : null;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const v = value as AnyRecord;

    if (Array.isArray(v.itinerary)) {
      const itineraryText = v.itinerary
        .map((dayRaw) => {
          if (!dayRaw || typeof dayRaw !== "object" || Array.isArray(dayRaw)) return "";
          const day = dayRaw as AnyRecord;
          const dayNum = Number(day.day);
          const dayTitle = String(day.title || "").trim();
          const dayHeader = Number.isFinite(dayNum) && dayNum > 0
            ? `DAY ${dayNum}${dayTitle ? `: ${dayTitle}` : ""}`
            : (dayTitle ? `DAY: ${dayTitle}` : "");

          const timeline = asActivityText(day.timeline) || "";
          const events = asActivityText(day.events) || "";
          const activities = asActivityText(day.activities) || "";
          const description = String(day.description || "").trim();
          const body = [timeline, events, activities, description]
            .filter((x) => x.length > 0)
            .join("\n");

          return [dayHeader, body].filter((x) => x.length > 0).join("\n");
        })
        .filter((x) => x.length > 0)
        .join("\n");

      if (itineraryText.length > 0) return itineraryText;
    }

    const dayNum = Number(v.day);
    const dayTitle = String(v.title || "").trim();
    const dayHeader = Number.isFinite(dayNum) && dayNum > 0
      ? `DAY ${dayNum}${dayTitle ? `: ${dayTitle}` : ""}`
      : (dayTitle ? `DAY: ${dayTitle}` : "");
    const timeline = asActivityText(v.timeline) || "";
    const events = asActivityText(v.events) || "";
    const activities = asActivityText(v.activities) || "";
    const description = String(v.description || "").trim();
    const dayBody = [timeline, events, activities, description]
      .filter((x) => x.length > 0)
      .join("\n");
    const dayText = [dayHeader, dayBody].filter((x) => x.length > 0).join("\n");
    if (dayText.length > 0 && (timeline || events || activities)) return dayText;

    const objectLine = formatActivityObject(v);
    if (objectLine) return objectLine;
  }

  return null;
}

export function extractPlannedActivities(metadata: unknown, packageSnapshot: unknown): string | null {
  const md = (metadata as AnyRecord) || null;
  const pkg = (packageSnapshot as AnyRecord) || null;

  return (
    asActivityText(md?.servicePlan && (md.servicePlan as AnyRecord).activities)
    || asActivityText(md?.agentPlan && (md.agentPlan as AnyRecord).activities)
    || asActivityText(md?.plan && (md.plan as AnyRecord).activities)
    || asActivityText(md?.agreedPlan && (md.agreedPlan as AnyRecord).activities)
    || asActivityText(md?.confirmedPlan && (md.confirmedPlan as AnyRecord).activities)
    || asActivityText(md?.servicePlan)
    || asActivityText(md?.agentPlan)
    || asActivityText(md?.plan)
    || asActivityText(md?.agreedPlan)
    || asActivityText(md?.confirmedPlan)
    || asActivityText(md?.itinerary)
    || asActivityText(pkg?.itinerary)
    || asActivityText(pkg?.package && (pkg.package as AnyRecord).itinerary)
    || asActivityText(pkg?.selectedPackage && (pkg.selectedPackage as AnyRecord).itinerary)
    || asActivityText(pkg?.details && (pkg.details as AnyRecord).itinerary)
    || asActivityText(pkg?.dayByDay && (pkg.dayByDay as AnyRecord).itinerary)
    || asActivityText(pkg?.timeline)
    || asActivityText(pkg)
    || asActivityText(md?.activities)
    || null
  );
}
