import type { APIRoute } from "astro";
import { entrar } from "../../../actions/auth.js";
import { isDbAvailable } from "../../../db/index.js";

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isDbAvailable()) {
    return Response.json({ ok: false, erro: "Banco de dados indisponível no momento." }, { status: 503 });
  }
  const fd = await request.formData().catch(() => null);
  const login = String(fd?.get("login") ?? "");
  const senha = String(fd?.get("senha") ?? "");
  const h = request.headers;
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  try {
    const r = await entrar(
      {
        set: (n, v, o) => cookies.set(n, v, o as never),
        delete: (n) => cookies.delete(n, { path: "/" }),
      },
      ip,
      login,
      senha,
    );
    return Response.json(r, { status: r.ok ? 200 : 401 });
  } catch {
    return Response.json({ ok: false, erro: "Falha interna no login." }, { status: 500 });
  }
};
