import type { APIRoute } from "astro";
import { atualizarStatusAtestado, enviarAtestado, excluirAtestado } from "../../../actions/atestado.js";
import { filaAtestados, listaMilitaresSimples } from "../../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

function semBanco() {
  return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
}

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return semBanco();
    const acao = ctx.url.searchParams.get("acao") ?? "enviar";
    try {
      if (acao === "status") {
        const body = await ctx.request.json().catch(() => null);
        const r = await atualizarStatusAtestado(Number(body?.atestadoId), body?.status, body?.justificativa);
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      if (acao === "excluir") {
        const body = await ctx.request.json().catch(() => null);
        const r = await excluirAtestado(Number(body?.atestadoId));
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      const fd = await ctx.request.formData().catch(() => null);
      if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
      const r = await enviarAtestado(fd);
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      const msg = e instanceof Error && e.name === "AcessoNegado" ? e.message : "Falha na operação.";
      return Response.json({ ok: false, erro: msg }, { status: 403 });
    }
  });

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    if (usuario.papel === "pessoal") return Response.json({ ok: false, erro: "Sem acesso." }, { status: 403 });
    try {
      const status = ctx.url.searchParams.get("status") ?? "todos";
      const busca = ctx.url.searchParams.get("busca") ?? "";
      const { linhas, totais } = await filaAtestados(status, busca);
      const militares = await listaMilitaresSimples();
      return Response.json({ ok: true, dados: { linhas, totais, militares, papel: usuario.papel } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar atestados." }, { status: 500 });
    }
  });
