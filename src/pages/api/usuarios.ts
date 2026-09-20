import type { APIRoute } from "astro";
import { criarUsuario, trocarStatusUsuario } from "../../actions/auth.js";
import { listaUsuarios } from "../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    if (usuario.papel !== "admin") return Response.json({ ok: false, erro: "Sem acesso." }, { status: 403 });
    try {
      return Response.json({ ok: true, dados: { usuarios: await listaUsuarios(), meuId: usuario.id } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao listar usuários." }, { status: 500 });
    }
  });

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
    try {
      if (ctx.url.searchParams.get("acao") === "status") {
        const body = await ctx.request.json().catch(() => null);
        const r = await trocarStatusUsuario(Number(body?.usuarioId));
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      const fd = await ctx.request.formData().catch(() => null);
      if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
      const r = await criarUsuario(String(fd.get("login") ?? ""), String(fd.get("senha") ?? ""), {
        nome: String(fd.get("nome") ?? ""),
        papel: String(fd.get("papel") ?? "secretaria"),
        email: String(fd.get("email") ?? "") || null,
        posto: String(fd.get("posto") ?? "") || null,
        crm: String(fd.get("crm") ?? "") || null,
        especialidade: String(fd.get("especialidade") ?? "") || null,
        om: String(fd.get("om") ?? "") || null,
      });
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      const msg = e instanceof Error && e.name === "AcessoNegado" ? e.message : "Falha na operação.";
      return Response.json({ ok: false, erro: msg }, { status: 403 });
    }
  });
