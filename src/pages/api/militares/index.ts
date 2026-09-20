import type { APIRoute } from "astro";
import { listarMilitares } from "../../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const busca = ctx.url.searchParams.get("busca") ?? "";
      const situacao = ctx.url.searchParams.get("situacao") ?? "todas";
      const dados = await listarMilitares(busca, situacao);
      return Response.json({ ok: true, dados: { ...dados, papel: usuario.papel } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao listar policiais militares." }, { status: 500 });
    }
  });
