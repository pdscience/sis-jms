import type { APIRoute } from "astro";
import { sair } from "../../../actions/auth.js";

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const h = request.headers;
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  await sair(
    {
      set: (n, v, o) => cookies.set(n, v, o as never),
      delete: (n) => cookies.delete(n, { path: "/" }),
    },
    ip,
  ).catch(() => undefined);
  return redirect("/login");
};
