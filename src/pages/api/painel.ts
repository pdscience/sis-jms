import type { APIRoute } from "astro";
import { obterPainel } from "../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    if (!(await getSessionUser(ctx))) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      return Response.json({ ok: true, dados: await obterPainel() });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar painel." }, { status: 500 });
    }
  });
