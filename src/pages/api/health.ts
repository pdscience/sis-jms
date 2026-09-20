import type { APIRoute } from "astro";

export const GET: APIRoute = () =>
  Response.json({ ok: true, sistema: "SIS-JIS", horario: new Date().toISOString() });
