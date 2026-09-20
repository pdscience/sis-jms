import type { APIRoute } from "astro";
import { listaAuditoria } from "../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    if (usuario.papel !== "admin") return Response.json({ ok: false, erro: "Sem acesso." }, { status: 403 });
    try {
      const busca = ctx.url.searchParams.get("busca") ?? "";
      return Response.json({ ok: true, dados: { eventos: await listaAuditoria(busca, 250) } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar auditoria." }, { status: 500 });
    }
  });
