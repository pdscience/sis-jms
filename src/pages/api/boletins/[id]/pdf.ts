import type { APIRoute } from "astro";
import { detalheBoletim } from "../../../../server/boletim.js";
import { gerarPdfBoletim } from "../../../../lib/pdf.js";
import { secoesTextoBoletim } from "../../../../lib/boletim.js";
import { registrarAuditoria } from "../../../../lib/audit.js";
import { comSessaoAstro, getSessionUser } from "../../../../lib/auth-context.js";
import { ipAtual } from "../../../../lib/auth.js";
import { isDbAvailable } from "../../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ erro: "Não autenticado." }, { status: 401 });

    const visao = await detalheBoletim(Number(ctx.params.id)).catch(() => null);
    if (!visao) return Response.json({ erro: "Boletim não encontrado." }, { status: 404 });

    const pdf = await gerarPdfBoletim({
      numero: visao.boletim.numero,
      ano: visao.boletim.ano,
      semana: String(visao.boletim.semana).slice(0, 10),
      status: visao.boletim.status,
      publicadoEm: visao.boletim.publicadoEm,
      om: usuario.om ?? "Polícia Militar de Rondônia",
      escala: visao.escala,
      secoes: secoesTextoBoletim(visao.boletim),
    });

    const h = ctx.request.headers;
    await registrarAuditoria(usuario, {
      acao: "EMITIR_PDF_BOLETIM", entidade: "boletim", entidadeId: visao.boletim.id,
      resumo: `PDF do BI nº ${visao.boletim.numero}/${visao.boletim.ano} gerado`,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? (await ipAtual()),
    }).catch(() => undefined);

    const nome = `bi_${String(visao.boletim.numero).padStart(3, "0")}_${visao.boletim.ano}`;
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  });
