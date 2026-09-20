import type { APIRoute } from "astro";
import { anularAta, homologarAta, publicarAta, registrarParecer } from "../../actions/junta.js";
import { casosParaJunta } from "../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    if (!["medico", "admin"].includes(usuario.papel ?? "")) {
      return Response.json({ ok: false, erro: "Sem acesso." }, { status: 403 });
    }
    try {
      return Response.json({ ok: true, dados: { casos: await casosParaJunta() } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar pauta." }, { status: 500 });
    }
  });

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
    const acao = ctx.url.searchParams.get("acao") ?? "parecer";
    try {
      if (acao === "homologar") {
        const body = await ctx.request.json().catch(() => null);
        const r = await homologarAta(Number(body?.inspecaoId));
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      if (acao === "anular") {
        const body = await ctx.request.json().catch(() => null);
        const r = await anularAta(Number(body?.inspecaoId), String(body?.motivo ?? ""));
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      const fd = await ctx.request.formData().catch(() => null);
      if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
      const r = acao === "publicar" ? await publicarAta(fd) : await registrarParecer(fd);
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      const msg = e instanceof Error && e.name === "AcessoNegado" ? e.message : "Falha na operação.";
      return Response.json({ ok: false, erro: msg }, { status: 403 });
    }
  });
