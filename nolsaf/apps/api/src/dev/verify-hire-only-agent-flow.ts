// Verifies the "hire-only" agent provisioning flow end-to-end without starting the HTTP server.
// It mounts the existing routers into an in-memory Express app and exercises them via supertest.

process.env.NODE_ENV = process.env.NODE_ENV || "development";

import "../env";
import express from "express";
import request from "supertest";
import adminCareersApplicationsRouter from "../routes/admin.careers.applications";
import adminAgentsRouter from "../routes/admin.agents";
import { prisma } from "@nolsaf/prisma";

type ApplicationsListResponse = {
  applications: Array<{ id: number; status: string; email: string; phone: string; agentId?: number | null; job?: any }>;
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

function unwrapAgentsItems(body: any): any[] {
  const b = body ?? {};
  const root = b?.data ?? b;
  if (Array.isArray(root)) return root;
  if (Array.isArray(root?.items)) return root.items;
  if (Array.isArray(root?.agents)) return root.agents;
  if (Array.isArray(root?.data?.items)) return root.data.items;
  return [];
}

async function main() {
  const app = express();
  app.use(express.json({ limit: "2mb" }));

  // Mount only the routes involved in the hiring->agent flow.
  app.use("/api/admin/careers/applications", adminCareersApplicationsRouter);
  app.use("/api/admin/agents", adminAgentsRouter);

  // 1) Fetch applications
  const listRes = await request(app)
    .get("/api/admin/careers/applications")
    .query({ page: 1, pageSize: 50 })
    .expect(200);

  const listBody = listRes.body as ApplicationsListResponse;
  const applications = Array.isArray(listBody?.applications) ? listBody.applications : [];

  if (applications.length === 0) {
    console.log("No job applications found in DB. Create an application first, then re-run this script.");
    process.exit(2);
  }

  // Prefer a non-HIRED application so we can exercise the provisioning.
  const candidate = applications.find((a) => String(a.status || "").toUpperCase() !== "HIRED") || applications[0];
  const applicationId = Number(candidate.id);

  console.log(`Using application ID ${applicationId} (current status: ${candidate.status})`);

  // 2) Patch status to HIRED
  const patchRes = await request(app)
    .patch(`/api/admin/careers/applications/${applicationId}`)
    .send({ status: "HIRED", adminNotes: `Auto-check (${new Date().toISOString()})` })
    .expect(200);

  console.log(`PATCH status => ${patchRes.body?.status || "(unknown)"}`);

  // 3) Re-fetch application and confirm agentId is set
  const getRes = await request(app)
    .get(`/api/admin/careers/applications/${applicationId}`)
    .expect(200);

  const updated = getRes.body as any;
  const agentId = updated?.agentId ?? updated?.agent?.id ?? null;

  if (!agentId) {
    console.log("Application is HIRED but agentId is not set.");
    console.log("This means the provisioning step did not link the application to an Agent profile.");
    process.exit(1);
  }

  // DB verification: the agent row exists and links to a user.
  const agent = await prisma.agent.findUnique({
    where: { id: Number(agentId) },
    include: { user: { select: { id: true, email: true, phone: true, role: true, name: true } } },
  });

  if (!agent) {
    console.log(`agentId=${agentId} is set on application but no Agent row exists.`);
    process.exit(1);
  }

  console.log(`Provisioned/linked Agent OK: agentId=${agent.id} userId=${agent.userId} role=${agent.user?.role}`);

  // Sanity check: confirm this script's Prisma client sees agents.
  const scriptAgentCount = await prisma.agent.count();
  console.log(`Script Prisma agent.count() = ${scriptAgentCount}`);

  // 4) Confirm the agent appears in the agents list endpoint.
  const agentsRes = await request(app)
    .get("/api/admin/agents")
    .query({ page: 1, pageSize: 200 })
    .expect(200);

  const agentsItems = unwrapAgentsItems(agentsRes.body);
  const found = agentsItems.some((a: any) => Number(a?.id) === Number(agent.id) || Number(a?.userId) === Number(agent.userId));

  console.log(`Agents list items: ${agentsItems.length}. Contains provisioned agent: ${found ? "YES" : "NO"}`);

  if (!found) {
    console.log("Agents endpoint raw body (truncated):");
    try {
      const raw = JSON.stringify(agentsRes.body);
      console.log(raw.length > 2000 ? raw.slice(0, 2000) + "…" : raw);
    } catch {
      console.log(String(agentsRes.body));
    }
    console.log("Note: Agent exists in DB but did not appear in /api/admin/agents response.");
    console.log("This usually indicates filtering in the agents endpoint or response-shape mismatch.");
    process.exit(1);
  }

  console.log("Hire-only agent flow verified successfully.");
}

main()
  .catch((err) => {
    console.error("Verification failed:", err);
    process.exit(1);
  })
  .finally(async () => {
    // Avoid hanging due to open handles.
    try {
      await prisma.$disconnect();
    } catch {
      // ignore
    }
  });
