import type { APIRoute } from "astro";
import { salvarEfetivo, statusEfetivo } from "../../actions/efetivo.js";
import { carregarEfetivo } from "../../server/efetivo.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    if (!(await getSessionUser(ctx))) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const busca = ctx.url.searchParams.get("busca") ?? "";
      return Response.json({ ok: true, dados: await carregarEfetivo(busca) });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar efetivo." }, { status: 500 });
    }
  });

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
    try {
      if (ctx.url.searchParams.get("acao") === "status") {
        const body = await ctx.request.json().catch(() => null);
        const id = Number(body?.id);
        if (!Number.isFinite(id)) return Response.json({ ok: false, erro: "Informe um id válido." }, { status: 400 });
        const r = await statusEfetivo(id, Boolean(body?.ativo));
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      const fd = await ctx.request.formData().catch(() => null);
      if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
      const r = await salvarEfetivo(fd);
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      if (e instanceof Error && e.name === "AcessoNegado") {
        return Response.json({ ok: false, erro: e.message }, { status: 403 });
      }
      return Response.json({ ok: false, erro: "Falha na operação." }, { status: 500 });
    }
  });
