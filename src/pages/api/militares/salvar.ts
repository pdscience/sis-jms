import type { APIRoute } from "astro";
import { salvarMilitar } from "../../../actions/militar.js";
import { comSessaoAstro } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
    const fd = await ctx.request.formData().catch(() => null);
    if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
    try {
      const r = await salvarMilitar(fd);
      return Response.json(r, { status: r.ok ? 200 : (r.erro?.startsWith("Acesso") || r.erro?.startsWith("Sessão") ? 403 : 400) });
    } catch (e) {
      const msg = e instanceof Error && e.name === "AcessoNegado" ? e.message : "Falha ao salvar policial militar.";
      return Response.json({ ok: false, erro: msg }, { status: 403 });
    }
  });
