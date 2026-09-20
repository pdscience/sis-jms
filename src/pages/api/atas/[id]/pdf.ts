import type { APIRoute } from "astro";
import { detalheAta } from "../../../../server/consultas.js";
import { gerarPdfAta } from "../../../../lib/pdf.js";
import { registrarAuditoria } from "../../../../lib/audit.js";
import { comSessaoAstro, getSessionUser } from "../../../../lib/auth-context.js";
import { ipAtual, podeVerSigilo } from "../../../../lib/auth.js";
import { isDbAvailable } from "../../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ erro: "Não autenticado." }, { status: 401 });

    const visao = await detalheAta(Number(ctx.params.id)).catch(() => null);
    if (!visao) {
      return Response.json({ erro: "Ata inexistente ou sem permissão de acesso para o seu perfil." }, { status: 404 });
    }

    const pdf = await gerarPdfAta({
      ata: visao.ata, militar: visao.militar, medico: visao.medico,
      homologador: visao.homologador, atestado: visao.atestado,
      completa: podeVerSigilo(usuario.papel),
    });

    const h = ctx.request.headers;
    await registrarAuditoria(usuario, {
      acao: "EMITIR_PDF_ATA", entidade: "inspecao", entidadeId: visao.ata.id,
      resumo: `PDF da ${visao.ata.ataNumero} gerado por ${usuario.nome}`,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? (await ipAtual()),
    }).catch(() => undefined);

    const nomeArquivo = visao.ata.ataNumero.replace(/[^\w\-]+/g, "_").replace(/_+/g, "_").toLowerCase();
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="ata_${nomeArquivo}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  });
