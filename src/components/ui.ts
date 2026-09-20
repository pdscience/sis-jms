import {
  NIVEL_LABEL,
  PARECER_LABEL,
  STATUS_ATESTADO_LABEL,
  STATUS_INSPECAO_LABEL,
  type NivelAlerta,
} from "@/lib/dominio";

export type Tom = "neutro" | "verde" | "ambar" | "vermelho" | "azul" | "ouro" | "roxo";

export const TOM_BADGE: Record<Tom, string> = {
  neutro: "bg-campo-100 text-campo-700 ring-campo-200",
  verde: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  ambar: "bg-amber-50 text-amber-800 ring-amber-200",
  vermelho: "bg-red-50 text-red-700 ring-red-200",
  azul: "bg-sky-50 text-sky-800 ring-sky-200",
  ouro: "bg-ouro-100 text-ouro-700 ring-ouro-300",
  roxo: "bg-violet-50 text-violet-700 ring-violet-200",
};

export const tomStatusAtestado = (status: string): Tom =>
  ({ pendente: "ambar", em_analise: "azul", homologado: "verde", nao_homologado: "vermelho", arquivado: "neutro" })[status] as Tom;

export const tomParecer = (parecer: string): Tom =>
  ({ apto: "verde", apto_com_restricao: "ouro", inapto_temporario: "ambar", inapto_definitivo: "vermelho", necessita_lts: "azul", agregacao: "roxo", reforma: "vermelho" })[parecer] as Tom;

export const tomNivel = (nivel: NivelAlerta): Tom =>
  ({ regular: "verde", monitorar: "azul", atencao: "ambar", critico: "vermelho", vencido: "vermelho" })[nivel] as Tom;

export const tomStatusAta = (status: string): Tom =>
  ({ rascunho: "neutro", emitida: "ambar", homologada: "azul", publicada: "verde" })[status] as Tom;

export const classeInput =
  "w-full rounded-lg border border-campo-300 bg-white px-3 py-2 text-sm text-campo-900 outline-none transition placeholder:text-campo-400 focus:border-campo-600 focus:ring-2 focus:ring-campo-600/15";

export const classeBotaoPrimario =
  "inline-flex items-center justify-center gap-2 rounded-lg bg-campo-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-campo-800 disabled:cursor-not-allowed disabled:opacity-60";

export const classeBotaoSecundario =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-campo-300 bg-white px-4 py-2 text-sm font-semibold text-campo-800 transition hover:border-campo-500 hover:bg-campo-50 disabled:opacity-60";

export const classeBotaoPerigo =
  "inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:opacity-60";

export const classeTabela = "min-w-full divide-y divide-campo-100 text-sm";
export const classeTh =
  "px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-campo-500";
export const classeTd = "px-4 py-3 align-middle text-campo-800";

export function rotuloParecer(parecer: string) {
  return PARECER_LABEL[parecer as keyof typeof PARECER_LABEL] ?? parecer;
}
export function rotuloStatusAtestado(status: string) {
  return STATUS_ATESTADO_LABEL[status] ?? status;
}
export function rotuloStatusAta(status: string) {
  return STATUS_INSPECAO_LABEL[status] ?? status;
}
export function rotuloNivel(nivel: NivelAlerta) {
  return NIVEL_LABEL[nivel] ?? nivel;
}
