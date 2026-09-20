import type { APIRoute } from "astro";
import { salvarSetor, statusSetor } from "../../actions/efetivo.js";
import { carregarEfetivo } from "../../server/efetivo.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    if (!(await getSessionUser(ctx))) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const { setores } = await carregarEfetivo("");
      return Response.json({ ok: true, dados: { setores } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar setores." }, { status: 500 });
    }
  });

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
    try {
      if (ctx.url.searchParams.get("acao") === "status") {
        const body = await ctx.request.json().catch(() => null);
        const r = await statusSetor(Number(body?.id), Boolean(body?.ativo));
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      const fd = await ctx.request.formData().catch(() => null);
      if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
      const r = await salvarSetor(fd);
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      const msg = e instanceof Error && e.name === "AcessoNegado" ? e.message : "Falha na operação.";
      return Response.json({ ok: false, erro: msg }, { status: 403 });
    }
  });
