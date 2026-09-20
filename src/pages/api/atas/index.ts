import type { APIRoute } from "astro";
import { listaAtas } from "../../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const busca = ctx.url.searchParams.get("busca") ?? "";
      const parecer = ctx.url.searchParams.get("parecer") ?? "todos";
      const status = ctx.url.searchParams.get("status") ?? "todos";
      const atas = await listaAtas(busca, parecer, status);
      return Response.json({ ok: true, dados: { atas, papel: usuario.papel } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao listar atas." }, { status: 500 });
    }
  });
