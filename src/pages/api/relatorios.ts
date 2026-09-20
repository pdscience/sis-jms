import type { APIRoute } from "astro";
import { listaAtas, relatorioPessoal } from "../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../lib/auth-context.js";
import { isDbAvailable } from "../../db/index.js";
import { formatBR } from "../../lib/datas.js";
import { PARECER_LABEL } from "../../lib/dominio.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const { linhas, resumo } = await relatorioPessoal();
      const atasPublicadas = await listaAtas("", "todos", "publicada");
      const extratos = atasPublicadas.map(({ ata, militar }) => {
        const periodo = ata.diasAfastamento > 0 ? `, com afastamento de ${ata.diasAfastamento} dia(s), no período de ${formatBR(ata.dataInicio)} a ${formatBR(ata.dataFim)}` : "";
        return `• ${ata.ataNumero}: o(a) ${militar.postoGraduacao} ${militar.nomeGuerra ?? militar.nome}, RE ${militar.re}, foi julgado(a) "${PARECER_LABEL[ata.parecer as keyof typeof PARECER_LABEL].toUpperCase()}" em inspeção de saúde realizada em ${formatBR(ata.dataInspecao)}${periodo}.`;
      });
      return Response.json({ ok: true, dados: { linhas, resumo, extratos, geradoPor: usuario.nome } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao gerar relatório." }, { status: 500 });
    }
  });
