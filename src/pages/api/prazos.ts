import type { APIRoute } from "astro";
import { listaPrazos } from "../../server/consultas.js";
import { all } from "../../db/index.js";
import type { Convocacao, Militar } from "../../db/schema.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const nivel = (ctx.url.searchParams.get("nivel") ?? "todos") as "todos";
      const busca = ctx.url.searchParams.get("busca") ?? "";
      const [resumos, todos, todasConv, mapaMilitares] = await Promise.all([
        listaPrazos(nivel as never, busca),
        listaPrazos("todos", ""),
        all<Convocacao>("convocacoes"),
        all<Militar>("militares"),
      ]);
      const convocacoesAbertas = todasConv.filter((c) => c.status === "pendente" || c.status === "notificada");
      return Response.json({
        ok: true,
        dados: { resumos, todos, convocacoesAbertas, mapaMilitares, papel: usuario.papel },
      });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar prazos." }, { status: 500 });
    }
  });
