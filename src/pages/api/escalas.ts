import type { APIRoute } from "astro";
import { adicionarEscala, removerEscala } from "../../actions/efetivo.js";
import { gradeSemana } from "../../server/efetivo.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    if (!(await getSessionUser(ctx))) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const semana = ctx.url.searchParams.get("semana") ?? "";
      if (!semana.trim()) return Response.json({ ok: false, erro: "Informe a semana." }, { status: 400 });
      return Response.json({ ok: true, dados: await gradeSemana(semana.trim()) });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar escala." }, { status: 500 });
    }
  });

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
    try {
      if (ctx.url.searchParams.get("acao") === "remover") {
        const body = await ctx.request.json().catch(() => null);
        const id = Number(body?.id);
        if (!Number.isFinite(id)) return Response.json({ ok: false, erro: "Informe um id válido." }, { status: 400 });
        const r = await removerEscala(id);
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      const fd = await ctx.request.formData().catch(() => null);
      if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
      const r = await adicionarEscala(fd);
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      if (e instanceof Error && e.name === "AcessoNegado") {
        return Response.json({ ok: false, erro: e.message }, { status: 403 });
      }
      return Response.json({ ok: false, erro: "Falha na operação." }, { status: 500 });
    }
  });
