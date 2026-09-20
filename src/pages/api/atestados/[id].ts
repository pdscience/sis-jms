import type { APIRoute } from "astro";
import { detalheAtestado } from "../../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    if (usuario.papel === "pessoal") return Response.json({ ok: false, erro: "Sem acesso." }, { status: 403 });
    try {
      const dados = await detalheAtestado(Number(ctx.params.id));
      if (!dados?.militar) return Response.json({ ok: false, erro: "Não encontrado." }, { status: 404 });
      return Response.json({ ok: true, dados: { ...dados, papel: usuario.papel } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar atestado." }, { status: 500 });
    }
  });
