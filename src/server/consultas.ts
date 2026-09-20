import { all, contar, porColuna, um } from "@/db";
import type {
  Afastamento,
  Atestado,
  Convocacao,
  Inspecao,
  Militar,
  Usuario,
} from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { exigirSessao, podeVerSigilo } from "@/lib/auth";
import { calcularPrazos, type ResumoPrazo } from "@/lib/prazos";
import { hoje } from "@/lib/datas";
import { PARECER_LABEL, type NivelAlerta } from "@/lib/dominio";
import { extratoParaBI, secoesDaAta, type SecaoAta } from "@/lib/ata";

export type MilitarLinha = {
  militar: Militar;
  resumo: ResumoPrazo;
  totalInspecoes: number;
  totalAtestados: number;
};

export type CasoJunta = {
  atestado: Atestado;
  militar: Militar;
  resumo: ResumoPrazo;
  historico: Inspecao[];
};

export type AtaLinha = {
  ata: Inspecao;
  militar: Militar;
  medico: Usuario | null;
};

export type AtaVisao = AtaLinha & {
  atestado: Atestado | null;
  homologador: Usuario | null;
  completa: boolean;
  secoes: SecaoAta[];
  extratoBI: string;
};

export type Painel = {
  usuario: Usuario;
  kpis: {
    totalMilitares: number;
    agregados: number;
    afastados: number;
    atestadosPendentes: number;
    atestadosEmAnalise: number;
    homologadosNoMes: number;
    inspecoesNoMes: number;
    alertasCriticos: number;
    convocacoesPendentes: number;
  };
  alertas: ResumoPrazo[];
  fila: AtividadeFila[];
  atasRecentes: AtaLinha[];
  distribuicao: { parecer: string; rotulo: string; total: number }[];
  atividades: { id: number; acao: string; resumo: string; usuarioNome: string; quando: string }[];
};

export type AtividadeFila = { atestado: Atestado; militar: Militar };

/* ------------------------------------------------------------------ */

const porDataDesc = (a: string, b: string) => (a < b ? 1 : a > b ? -1 : 0);

async function carregarTudo() {
  await ensureSeed();
  const [
    listaMilitares,
    listaAfastamentos,
    listaInspecoes,
    listaConvocacoes,
    listaAtestados,
    listaUsuarios,
    eventosAuditoria,
  ] = await Promise.all([
    all<Militar>("militares"),
    all<Afastamento>("afastamentos"),
    all<Inspecao>("inspecoes", { order: { coluna: "dataInspecao", asc: false } }),
    all<Convocacao>("convocacoes"),
    all<Atestado>("atestados", { order: { coluna: "criadoEm", asc: false } }),
    all<Usuario>("usuarios"),
    all<AuditoriaEvento>("auditoria", { order: { coluna: "criadoEm", asc: false }, limit: 8 }),
  ]);
  return {
    listaMilitares,
    listaAfastamentos,
    listaInspecoes,
    listaConvocacoes,
    listaAtestados,
    listaUsuarios,
    eventosAuditoria,
  };
}

export async function obterPainel(): Promise<Painel> {
  const usuario = await exigirSessao();
  const dados = await carregarTudo();
  const prazos = calcularPrazos({
    militares: dados.listaMilitares,
    afastamentos: dados.listaAfastamentos,
    inspecoes: dados.listaInspecoes,
    convocacoes: dados.listaConvocacoes,
  });

  const referencia = hoje();
  const inicioMes = referencia.slice(0, 7);

  const fila = dados.listaAtestados
    .filter((a) => a.status === "pendente" || a.status === "em_analise")
    .slice(0, 6)
    .map((atestado) => ({
      atestado,
      militar:
        dados.listaMilitares.find((m) => m.id === atestado.militarId) ??
        dados.listaMilitares[0],
    }))
    .filter((item) => Boolean(item.militar));

  const atasRecentes: AtaLinha[] = dados.listaInspecoes.slice(0, 6).map((ata) => ({
    ata,
    militar: dados.listaMilitares.find((m) => m.id === ata.militarId)!,
    medico: dados.listaUsuarios.find((u) => u.id === ata.medicoId) ?? null,
  }));

  const distribuicao = (Object.keys(PARECER_LABEL) as (keyof typeof PARECER_LABEL)[]).map(
    (parecer) => ({
      parecer,
      rotulo: PARECER_LABEL[parecer],
      total: dados.listaInspecoes.filter((i) => i.parecer === parecer).length,
    }),
  );

  const recentes = dados.eventosAuditoria;
  const atividades = recentes.map((a) => ({
    id: a.id,
    acao: a.acao,
    resumo: a.resumo ?? a.acao,
    usuarioNome: a.usuarioNome,
    quando: a.criadoEm,
  }));

  return {
    usuario,
    kpis: {
      totalMilitares: dados.listaMilitares.length,
      agregados: dados.listaMilitares.filter((m) => m.situacao === "agregado").length,
      afastados: prazos.filter((p) => p.dataFim !== null).length,
      atestadosPendentes: dados.listaAtestados.filter((a) => a.status === "pendente").length,
      atestadosEmAnalise: dados.listaAtestados.filter((a) => a.status === "em_analise").length,
      homologadosNoMes: dados.listaAtestados.filter(
        (a) => a.status === "homologado" && String(a.dataApresentacao).startsWith(inicioMes),
      ).length,
      inspecoesNoMes: dados.listaInspecoes.filter((i) =>
        String(i.dataInspecao).startsWith(inicioMes),
      ).length,
      alertasCriticos: prazos.filter(
        (p) => p.nivel === "critico" || p.nivel === "vencido",
      ).length,
      convocacoesPendentes: dados.listaConvocacoes.filter(
        (c) => c.status === "pendente" || c.status === "notificada",
      ).length,
    },
    alertas: prazos.filter((p) => p.nivel !== "regular").slice(0, 8),
    fila,
    atasRecentes,
    distribuicao,
    atividades: usuario.papel === "pessoal" ? [] : atividades,
  };
}

export async function listarMilitares(
  busca = "",
  situacao = "todas",
): Promise<{ linhas: MilitarLinha[]; oms: string[] }> {
  await exigirSessao();
  const dados = await carregarTudo();
  const prazos = calcularPrazos({
    militares: dados.listaMilitares,
    afastamentos: dados.listaAfastamentos,
    inspecoes: dados.listaInspecoes,
    convocacoes: dados.listaConvocacoes,
  });

  const termo = busca.trim().toLowerCase();
  const linhas = prazos
    .filter((p) => {
      if (situacao !== "todas" && p.militar.situacao !== situacao) return false;
      if (!termo) return true;
      return [p.militar.nome, p.militar.nomeGuerra, p.militar.re, p.militar.cpf, p.militar.om]
        .filter(Boolean)
        .some((campo) => campo!.toLowerCase().includes(termo));
    })
    .map((resumo) => ({
      militar: resumo.militar,
      resumo,
      totalInspecoes: dados.listaInspecoes.filter((i) => i.militarId === resumo.militar.id)
        .length,
      totalAtestados: dados.listaAtestados.filter((a) => a.militarId === resumo.militar.id)
        .length,
    }));

  const oms = Array.from(new Set(dados.listaMilitares.map((m) => m.om))).sort();
  return { linhas, oms };
}

export async function perfilMilitar(militarId: number) {
  const usuario = await exigirSessao();
  await ensureSeed();
  const completa = podeVerSigilo(usuario.papel);

  const militar = await um<Militar>("militares", "id", militarId);
  if (!militar) return null;

  const [listaAtestados, listaInspecoes, listaAfastamentos, listaConvocacoes, listaUsuarios] =
    await Promise.all([
      porColuna<Atestado>("atestados", "militarId", militarId, { order: { coluna: "dataEmissao", asc: false } }),
      porColuna<Inspecao>("inspecoes", "militarId", militarId, { order: { coluna: "dataInspecao", asc: false } }),
      porColuna<Afastamento>("afastamentos", "militarId", militarId, { order: { coluna: "dataInicio", asc: false } }),
      porColuna<Convocacao>("convocacoes", "militarId", militarId, { order: { coluna: "emitidaEm", asc: false } }),
      all<Usuario>("usuarios"),
    ]);

  const resumo = calcularPrazos({
    militares: [militar],
    afastamentos: listaAfastamentos,
    inspecoes: listaInspecoes,
    convocacoes: listaConvocacoes,
  })[0];

  const inspecoesVisiveis = completa
    ? listaInspecoes
    : listaInspecoes.map((i) => ({ ...i, cid: null, descricaoClinica: null, examesRealizados: null }));

  const eventosBrutos = await porColuna<AuditoriaEvento>("auditoria", "entidadeId", String(militarId), {
    order: { coluna: "criadoEm", asc: false },
    limit: 20,
  });

  return {
    militar,
    resumo,
    atestados: listaAtestados,
    inspecoes: inspecoesVisiveis,
    afastamentos: listaAfastamentos as Afastamento[],
    convocacoes: listaConvocacoes as Convocacao[],
    usuarios: listaUsuarios,
    eventos: eventosBrutos,
    completa,
  };
}

type AuditoriaEvento = {
  id: number;
  acao: string;
  resumo: string | null;
  usuarioNome: string;
  papel: string | null;
  criadoEm: string;
  entidadeId: string | null;
  entidade: string;
  ip: string | null;
};

export async function filaAtestados(
  status = "todos",
  busca = "",
): Promise<{ linhas: AtividadeFila[]; totais: Record<string, number> }> {
  await exigirSessao();
  const dados = await carregarTudo();
  const termo = busca.trim().toLowerCase();

  const linhas = dados.listaAtestados
    .filter((a) => (status === "todos" ? true : a.status === status))
    .filter((a) => {
      if (!termo) return true;
      const militar = dados.listaMilitares.find((m) => m.id === a.militarId);
      return [a.protocolo, a.emitente, a.cid, militar?.nome, militar?.re, militar?.nomeGuerra]
        .filter(Boolean)
        .some((c) => c!.toLowerCase().includes(termo));
    })
    .map((atestado) => ({
      atestado,
      militar: dados.listaMilitares.find((m) => m.id === atestado.militarId)!,
    }))
    .filter((l) => Boolean(l.militar));

  const totais: Record<string, number> = { todos: dados.listaAtestados.length };
  for (const a of dados.listaAtestados) totais[a.status] = (totais[a.status] ?? 0) + 1;

  return { linhas, totais };
}

export async function detalheAtestado(atestadoId: number) {
  const usuario = await exigirSessao();
  await ensureSeed();
  const completa = podeVerSigilo(usuario.papel);

  const atestado = await um<Atestado>("atestados", "id", atestadoId);
  if (!atestado) return null;

  const militar = await um<Militar>("militares", "id", atestado.militarId);

  const historicoAtestados = await porColuna<Atestado>("atestados", "militarId", atestado.militarId, {
    order: { coluna: "dataEmissao", asc: false },
  });

  const historicoInspecoes = await porColuna<Inspecao>("inspecoes", "militarId", atestado.militarId, {
    order: { coluna: "dataInspecao", asc: false },
  });

  const listaAfastamentos = await porColuna<Afastamento>("afastamentos", "militarId", atestado.militarId);

  const resumo = calcularPrazos({
    militares: militar ? [militar] : [],
    afastamentos: listaAfastamentos,
    inspecoes: historicoInspecoes,
  })[0];

  const eventosBrutos = await porColuna<AuditoriaEvento>("auditoria", "entidadeId", String(atestadoId), {
    order: { coluna: "criadoEm", asc: false },
  });
  const eventos = eventosBrutos.filter((e) => e.entidade === "atestado");

  return {
    atestado,
    militar,
    resumo,
    historicoAtestados,
    historicoInspecoes: completa
      ? historicoInspecoes
      : historicoInspecoes.map((i) => ({ ...i, descricaoClinica: null, examesRealizados: null })),
    eventos,
    completa,
    podeVerArquivo: usuario.papel !== "pessoal",
  };
}

export async function casosParaJunta(busca = ""): Promise<CasoJunta[]> {
  await exigirSessao();
  const dados = await carregarTudo();
  const prazos = calcularPrazos({
    militares: dados.listaMilitares,
    afastamentos: dados.listaAfastamentos,
    inspecoes: dados.listaInspecoes,
    convocacoes: dados.listaConvocacoes,
  });
  const termo = busca.trim().toLowerCase();

  return dados.listaAtestados
    .filter((a) => a.status === "pendente" || a.status === "em_analise")
    .map((atestado) => {
      const militar = dados.listaMilitares.find((m) => m.id === atestado.militarId);
      if (!militar) return null;
      const resumo = prazos.find((p) => p.militar.id === militar.id)!;
      return {
        atestado,
        militar,
        resumo,
        historico: dados.listaInspecoes
          .filter((i) => i.militarId === militar.id)
          .slice(0, 3) as Inspecao[],
      } satisfies CasoJunta;
    })
    .filter((c): c is CasoJunta => Boolean(c))
    .filter((c) => {
      if (!termo) return true;
      return [c.militar.nome, c.militar.nomeGuerra, c.militar.re, c.atestado.protocolo, c.atestado.cid]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(termo));
    });
}

export async function listaPrazos(
  nivel: NivelAlerta | "todos" = "todos",
  busca = "",
): Promise<ResumoPrazo[]> {
  await exigirSessao();
  const dados = await carregarTudo();
  const prazos = calcularPrazos({
    militares: dados.listaMilitares,
    afastamentos: dados.listaAfastamentos,
    inspecoes: dados.listaInspecoes,
    convocacoes: dados.listaConvocacoes,
  });
  const termo = busca.trim().toLowerCase();
  return prazos
    .filter((p) => (nivel === "todos" ? p.nivel !== "regular" || p.diasAcumulados > 0 : p.nivel === nivel))
    .filter((p) => {
      if (!termo) return true;
      return [p.militar.nome, p.militar.nomeGuerra, p.militar.re, p.militar.om]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(termo));
    });
}

export async function listaAtas(
  busca = "",
  parecer = "todos",
  status = "todos",
): Promise<AtaLinha[]> {
  const usuario = await exigirSessao();
  const dados = await carregarTudo();
  const termo = busca.trim().toLowerCase();
  const completa = podeVerSigilo(usuario.papel);

  let linhas = dados.listaInspecoes
    .filter((i) => (parecer === "todos" ? true : i.parecer === parecer))
    .filter((i) => (status === "todos" ? true : i.status === status))
    .map((ata) => {
      const militar = dados.listaMilitares.find((m) => m.id === ata.militarId);
      if (!militar) return null;
      return { ata, militar, medico: dados.listaUsuarios.find((u) => u.id === ata.medicoId) ?? null };
    })
    .filter((l): l is AtaLinha => Boolean(l));

  // A Seção de Pessoal acompanha apenas atas homologadas/publicadas.
  if (usuario.papel === "pessoal") {
    linhas = linhas.filter(
      (l) => l.ata.status === "homologada" || l.ata.status === "publicada",
    );
  }

  if (termo) {
    linhas = linhas.filter((l) =>
      [l.ata.ataNumero, l.militar.nome, l.militar.nomeGuerra, l.militar.re, l.militar.om, completa ? l.ata.cid : null]
        .filter(Boolean)
        .some((v) => v!.toLowerCase().includes(termo)),
    );
  }
  return linhas;
}

export async function detalheAta(inspecaoId: number): Promise<AtaVisao | null> {
  const usuario = await exigirSessao();
  await ensureSeed();
  const completa = podeVerSigilo(usuario.papel);

  const ata = await um<Inspecao>("inspecoes", "id", inspecaoId);
  if (!ata) return null;
  if (usuario.papel === "pessoal" && ata.status !== "homologada" && ata.status !== "publicada") {
    return null;
  }

  const militar = await um<Militar>("militares", "id", ata.militarId);
  if (!militar) return null;

  const usuarios = await all<Usuario>("usuarios");
  const medico = usuarios.find((u) => u.id === ata.medicoId) ?? null;
  const homologador = usuarios.find((u) => u.id === ata.homologadoPor) ?? null;

  const atestado = ata.atestadoId ? await um<Atestado>("atestados", "id", ata.atestadoId) : null;

  const dados = { ata, militar, medico, homologador, atestado, completa };
  return {
    ata,
    militar,
    medico,
    homologador,
    atestado,
    completa,
    secoes: secoesDaAta(dados),
    extratoBI: extratoParaBI(dados),
  };
}

export async function relatorioPessoal() {
  const usuario = await exigirSessao();
  const dados = await carregarTudo();
  const prazos = calcularPrazos({
    militares: dados.listaMilitares,
    afastamentos: dados.listaAfastamentos,
    inspecoes: dados.listaInspecoes,
    convocacoes: dados.listaConvocacoes,
  });

  const linhas = prazos.map((p) => {
    const ultima = p.ultimaInspecao;
    return {
      re: p.militar.re,
      nome: p.militar.nome,
      nomeGuerra: p.militar.nomeGuerra ?? "—",
      posto: p.militar.postoGraduacao,
      om: p.militar.om,
      situacao: p.militar.situacao,
      ultimoParecer: ultima ? PARECER_LABEL[ultima.parecer as keyof typeof PARECER_LABEL] : "Sem registro",
      ata: ultima?.ataNumero ?? "—",
      dataInspecao: ultima?.dataInspecao ?? null,
      diasAcumulados: p.diasAcumulados,
      afastadoAte: p.dataFim,
      nivel: p.nivel,
      convocado: p.convocacaoPendente ? p.convocacaoPendente.dataLimite : null,
      enquadramento: ultima?.enquadramentoLegal ?? "—",
    };
  });

  const resumo = {
    aptos: linhas.filter((l) =>
      ["Apto", "Apto com restrição"].includes(l.ultimoParecer),
    ).length,
    inaptosTemporarios: linhas.filter(
      (l) => l.ultimoParecer === "Inapto temporário" || l.ultimoParecer === "Necessita de LTS",
    ).length,
    inaptosDefinitivos: linhas.filter(
      (l) => l.ultimoParecer === "Inapto definitivo" || l.ultimoParecer === "Proposta de reforma",
    ).length,
    agregados: linhas.filter((l) => l.situacao === "agregado").length,
    semInspecao: linhas.filter((l) => l.ultimoParecer === "Sem registro").length,
    convocacoesAbertas: dados.listaConvocacoes.filter(
      (c) => c.status === "pendente" || c.status === "notificada",
    ).length,
  };

  return { linhas, resumo, geradoPor: usuario.nome, papel: usuario.papel };
}

export async function listaAuditoria(busca = "", limite = 120) {
  await exigirSessao();
  await ensureSeed();
  const termo = busca.trim().toLowerCase();

  const eventos = await all<AuditoriaEvento>("auditoria", {
    order: { coluna: "criadoEm", asc: false },
    limit: limite,
  });

  return termo
    ? eventos.filter((e) =>
        [e.acao, e.resumo, e.usuarioNome, e.entidade, e.entidadeId]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(termo)),
      )
    : eventos;
}

export async function listaUsuarios() {
  await exigirSessao();
  await ensureSeed();
  const usuarios = await all<Usuario>("usuarios");
  return usuarios.sort((a, b) =>
    a.papel === b.papel ? a.nome.localeCompare(b.nome) : a.papel.localeCompare(b.papel),
  );
}

export async function buscarMilitares(termo: string) {
  await exigirSessao();
  await ensureSeed();
  const t = termo.trim().toLowerCase();
  if (!t) return [];
  const todos = await all<Militar>("militares", { limit: 200 });
  return todos
    .filter((m) =>
      [m.nome, m.nomeGuerra, m.re, m.cpf].filter(Boolean).some((c) => c!.toLowerCase().includes(t)),
    )
    .slice(0, 12)
    .map((m) => ({
      id: m.id,
      re: m.re,
      nome: m.nome,
      nomeGuerra: m.nomeGuerra,
      postoGraduacao: m.postoGraduacao,
      om: m.om,
      situacao: m.situacao,
    }));
}

export async function estatisticasGerais() {
  await ensureSeed();
  return contar("militares");
}

export async function listaMilitaresSimples() {
  await exigirSessao();
  await ensureSeed();
  const todos = await all<Militar>("militares", { order: { coluna: "nome", asc: true } });
  return todos.map((m) => ({
    id: m.id,
    re: m.re,
    nome: m.nome,
    nomeGuerra: m.nomeGuerra,
    postoGraduacao: m.postoGraduacao,
    om: m.om,
  }));
}

export async function ultimaAtualizacao(): Promise<string> {
  return String(await contar("inspecoes"));
}

export { porDataDesc };
