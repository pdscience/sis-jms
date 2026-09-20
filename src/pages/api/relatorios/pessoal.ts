import type { APIRoute } from "astro";
import { relatorioPessoal } from "../../../server/consultas.js";
import { registrarAuditoria } from "../../../lib/audit.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";
import { ipAtual } from "../../../lib/auth.js";
import { isDbAvailable } from "../../../db/index.js";
import { formatBR } from "../../../lib/datas.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ erro: "Não autenticado." }, { status: 401 });

    const relatorio = await relatorioPessoal();
    const cabecalho = ["RE", "Nome", "Nome de guerra", "Posto/Graduação", "OM", "Situação", "Último parecer", "Ata", "Data da inspeção", "Dias acumulados (12m)", "Afastado até", "Nível de alerta", "Convocação (limite)", "Enquadramento legal"];
    const linhas = relatorio.linhas.map((l) => [
      l.re, l.nome, l.nomeGuerra, l.posto, l.om, l.situacao, l.ultimoParecer, l.ata,
      l.dataInspecao ? formatBR(l.dataInspecao) : "—", String(l.diasAcumulados),
      l.afastadoAte ? formatBR(l.afastadoAte) : "—", l.nivel,
      l.convocado ? formatBR(l.convocado) : "—", l.enquadramento,
    ]);
    const csv = [cabecalho, ...linhas]
      .map((linha) => linha.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";"))
      .join("\r\n");

    const h = ctx.request.headers;
    await registrarAuditoria(usuario, {
      acao: "EXPORTAR_RELATORIO", entidade: "relatorio", entidadeId: "S1",
      resumo: `Relatório de aptos/inaptos exportado em CSV por ${usuario.nome} (${relatorio.linhas.length} registros)`,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? (await ipAtual()),
    }).catch(() => undefined);

    return new Response(`\uFEFF${csv}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="relatorio_jis_${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  });
