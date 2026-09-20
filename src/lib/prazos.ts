import type { Afastamento, Convocacao, Inspecao, Militar } from "@/db/schema";
import {
  ANTECEDENCIA_REAVALIACAO,
  LIMITE_AGREGACAO_DIAS,
  nivelPorDiasAcumulados,
  type NivelAlerta,
} from "@/lib/dominio";
import { addDias, diffDias, hoje } from "@/lib/datas";

export type ResumoPrazo = {
  militar: Militar;
  afastamentoVigente: Afastamento | null;
  diasAcumulados: number;
  diasVigentes: number;
  dataFim: string | null;
  diasRestantes: number;
  nivel: NivelAlerta;
  agregado: boolean;
  diasParaAgregacao: number;
  ultimaInspecao: Inspecao | null;
  convocacaoPendente: Convocacao | null;
  reavaliacaoNecessaria: boolean;
  proximaConvocacao: string;
  totalAfastamentos: number;
};

type Entrada = {
  militares: Militar[];
  afastamentos: Afastamento[];
  inspecoes?: Inspecao[];
  convocacoes?: Convocacao[];
};

/**
 * Consolida, por militar, os prazos de afastamento, o acumulado de dias
 * (base para agregação) e a necessidade de convocação para reavaliação.
 */
export function calcularPrazos({
  militares,
  afastamentos,
  inspecoes = [],
  convocacoes = [],
}: Entrada): ResumoPrazo[] {
  const referencia = hoje();
  const inicioJanela = addDias(referencia, -365);

  return militares
    .map((militar) => {
      const doMilitar = afastamentos
        .filter((a) => a.militarId === militar.id)
        .sort((a, b) => (a.dataInicio < b.dataInicio ? 1 : -1));

      const vigentes = doMilitar.filter(
        (a) => a.situacao !== "encerrado" && a.dataFim >= referencia,
      );
      const naJanela = doMilitar.filter((a) => a.dataFim >= inicioJanela);

      const diasVigentes = vigentes.reduce(
        (total, a) => total + Math.max(a.dias - Math.max(diffDias(a.dataInicio, referencia), 0), 0),
        0,
      );
      const diasAcumulados = naJanela.reduce((total, a) => total + a.dias, 0);

      const dataFim = vigentes.length
        ? vigentes.map((a) => a.dataFim).sort().at(-1)!
        : null;
      const diasRestantes = dataFim ? diffDias(referencia, dataFim) : Infinity;

      const inspecoesMilitar = inspecoes
        .filter((i) => i.militarId === militar.id)
        .sort((a, b) => (a.dataInspecao < b.dataInspecao ? 1 : -1));
      const ultimaInspecao = inspecoesMilitar[0] ?? null;

      const convocacaoPendente =
        convocacoes.find(
          (c) =>
            c.militarId === militar.id &&
            (c.status === "pendente" || c.status === "notificada"),
        ) ?? null;

      const vencido = Boolean(dataFim) === false && Boolean(vigentes.length);
      let nivel: NivelAlerta = nivelPorDiasAcumulados(diasAcumulados);
      if (diasRestantes < 0) nivel = "vencido";
      else if (diasRestantes <= ANTECEDENCIA_REAVALIACAO && dataFim) nivel = "critico";
      else if (nivel === "regular" && diasAcumulados > 0) nivel = nivelPorDiasAcumulados(diasAcumulados);
      if (vencido) nivel = "critico";

      const reavaliacaoNecessaria =
        (dataFim !== null && diasRestantes <= ANTECEDENCIA_REAVALIACAO) ||
        (ultimaInspecao?.necessitaReavaliacao ?? false) ||
        diasAcumulados >= LIMITE_AGREGACAO_DIAS * 0.8;

      return {
        militar,
        afastamentoVigente: vigentes[0] ?? null,
        diasAcumulados,
        diasVigentes,
        dataFim,
        diasRestantes: Number.isFinite(diasRestantes) ? diasRestantes : -1,
        nivel,
        agregado: diasAcumulados >= LIMITE_AGREGACAO_DIAS || militar.situacao === "agregado",
        diasParaAgregacao: Math.max(LIMITE_AGREGACAO_DIAS - diasAcumulados, 0),
        ultimaInspecao,
        convocacaoPendente,
        reavaliacaoNecessaria: reavaliacaoNecessaria && !convocacaoPendente,
        proximaConvocacao: dataFim
          ? addDias(dataFim, -ANTECEDENCIA_REAVALIACAO)
          : referencia,
        totalAfastamentos: doMilitar.length,
      } satisfies ResumoPrazo;
    })
    .sort((a, b) => {
      const peso: Record<NivelAlerta, number> = {
        vencido: 0,
        critico: 1,
        atencao: 2,
        monitorar: 3,
        regular: 4,
      };
      if (peso[a.nivel] !== peso[b.nivel]) return peso[a.nivel] - peso[b.nivel];
      return b.diasAcumulados - a.diasAcumulados;
    });
}

export const NIVEL_ORDEM: NivelAlerta[] = [
  "vencido",
  "critico",
  "atencao",
  "monitorar",
  "regular",
];
