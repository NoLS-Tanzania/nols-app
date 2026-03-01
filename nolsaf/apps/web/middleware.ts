// middleware.ts — Next.js edge middleware
// Re-exports the proxy guard from proxy.ts as the required `middleware` export.
export { proxy as middleware, config } from "./proxy";
