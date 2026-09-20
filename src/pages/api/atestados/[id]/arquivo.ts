import type { APIRoute } from "astro";
import { isDbAvailable, um } from "../../../../db/index.js";
import type { Atestado, Militar } from "../../../../db/schema.js";
import { ensureSeed } from "../../../../lib/seed.js";
import { registrarAuditoria } from "../../../../lib/audit.js";
import { comSessaoAstro, getSessionUser } from "../../../../lib/auth-context.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ erro: "Banco indisponível." }, { status: 503 });
    try { await ensureSeed(); } catch { /* segue */ }
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ erro: "Não autenticado." }, { status: 401 });
    if (usuario.papel === "pessoal") {
      return Response.json({ erro: "A Seção de Pessoal não tem acesso a documentos clínicos." }, { status: 403 });
    }
    const atestado = await um<Atestado>("atestados", "id", Number(ctx.params.id));
    if (!atestado?.arquivoBase64) return Response.json({ erro: "Anexo indisponível." }, { status: 404 });

    const militar = await um<Militar>("militares", "id", atestado.militarId);
    const h = ctx.request.headers;
    await registrarAuditoria(usuario, {
      acao: "VISUALIZAR_ANEXO", entidade: "atestado", entidadeId: atestado.id,
      resumo: `Anexo do atestado ${atestado.protocolo} visualizado por ${usuario.nome}`,
      detalhes: { militar: militar?.nome ?? null },
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null,
    }).catch(() => undefined);

    return new Response(Buffer.from(atestado.arquivoBase64, "base64"), {
      status: 200,
      headers: {
        "Content-Type": atestado.arquivoMime ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${(atestado.arquivoNome ?? "anexo").replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  });
