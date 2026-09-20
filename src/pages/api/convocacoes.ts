import type { APIRoute } from "astro";
import { atualizarConvocacao, convocarReavaliacao, gerarConvocacoesAutomaticas } from "../../actions/prazo.js";
import { comSessaoAstro } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

function semBanco() {
  return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
}

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return semBanco();
    const acao = ctx.url.searchParams.get("acao") ?? "emitir";
    try {
      if (acao === "automaticas") {
        const r = await gerarConvocacoesAutomaticas();
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      if (acao === "atualizar") {
        const body = await ctx.request.json().catch(() => null);
        const r = await atualizarConvocacao(Number(body?.convocacaoId), body?.status);
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      const fd = await ctx.request.formData().catch(() => null);
      if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
      const r = await convocarReavaliacao(fd);
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      const msg = e instanceof Error && e.name === "AcessoNegado" ? e.message : "Falha na operação.";
      return Response.json({ ok: false, erro: msg }, { status: 403 });
    }
  });
