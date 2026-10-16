import type { APIRoute } from "astro";
import { detalheBoletim } from "../../../server/boletim.js";
import { all, isDbAvailable } from "../../../db/index.js";
import type { AuditoriaRow } from "../../../db/schema.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const visao = await detalheBoletim(Number(ctx.params.id));
      if (!visao) return Response.json({ ok: false, erro: "Boletim não encontrado." }, { status: 404 });
      const todos = await all<AuditoriaRow>("auditoria", { order: { coluna: "criadoEm", asc: false } });
      const eventos = todos.filter((e) => e.entidade === "boletim" && e.entidadeId === String(visao.boletim.id));
      return Response.json({ ok: true, dados: { ...visao, eventos, papel: usuario.papel } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar boletim." }, { status: 500 });
    }
  });
