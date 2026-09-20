import type { APIRoute } from "astro";
import { detalheAta } from "../../../server/consultas.js";
import { all } from "../../../db/index.js";
import type { AuditoriaRow } from "../../../db/schema.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const visao = await detalheAta(Number(ctx.params.id));
      if (!visao) return Response.json({ ok: false, erro: "Não encontrado." }, { status: 404 });
      const todos = await all<AuditoriaRow>("auditoria", { order: { coluna: "criadoEm", asc: false } });
      const eventos = todos.filter((e) => e.entidade === "inspecao" && e.entidadeId === String(visao.ata.id));
      return Response.json({ ok: true, dados: { ...visao, eventos, papel: usuario.papel } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar ata." }, { status: 500 });
    }
  });
