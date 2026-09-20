import type { APIRoute } from "astro";
import { alterarSituacao } from "../../../actions/militar.js";
import { comSessaoAstro } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
    const body = await ctx.request.json().catch(() => null);
    const militarId = Number(body?.militarId);
    const situacao = String(body?.situacao ?? "");
    if (!Number.isFinite(militarId) || !situacao) {
      return Response.json({ ok: false, erro: "Parâmetros inválidos." }, { status: 400 });
    }
    try {
      const r = await alterarSituacao(militarId, situacao);
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      const msg = e instanceof Error && e.name === "AcessoNegado" ? e.message : "Falha ao atualizar situação.";
      return Response.json({ ok: false, erro: msg }, { status: 403 });
    }
  });
