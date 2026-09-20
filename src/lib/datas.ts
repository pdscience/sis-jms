/** Utilitários de data no formato ISO (YYYY-MM-DD) e exibição pt-BR. */

export function hoje(): string {
  const agora = new Date();
  return isoDe(agora);
}

export function isoDe(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");
  return `${ano}-${mes}-${dia}`;
}

export function paraData(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const [ano, mes, dia] = iso.slice(0, 10).split("-").map(Number);
  if (!ano || !mes || !dia) return null;
  return new Date(ano, mes - 1, dia);
}

export function addDias(iso: string | null | undefined, dias: number): string {
  const base = paraData(iso) ?? new Date();
  base.setDate(base.getDate() + dias);
  return isoDe(base);
}

/** Dias entre a e b (b - a). */
export function diffDias(a: string | null | undefined, b: string | null | undefined): number {
  const d1 = paraData(a);
  const d2 = paraData(b);
  if (!d1 || !d2) return 0;
  return Math.round((d2.getTime() - d1.getTime()) / 86400000);
}

export function diasInclusive(inicio: string, fim: string): number {
  const total = diffDias(inicio, fim) + 1;
  return total > 0 ? total : 0;
}

export function formatBR(iso: string | Date | null | undefined): string {
  if (!iso) return "—";
  const data = typeof iso === "string" ? paraData(iso) : iso;
  if (!data) return "—";
  return isoDe(data).split("-").reverse().join("/");
}

export function formatDataHora(data: Date | string | null | undefined): string {
  if (!data) return "—";
  const d = typeof data === "string" ? new Date(data) : data;
  if (Number.isNaN(d.getTime())) return "—";
  return `${formatBR(d)} ${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes(),
  ).padStart(2, "0")}`;
}

export function mesPorExtenso(iso: string | Date | null | undefined): string {
  const data = typeof iso === "string" ? paraData(iso) : iso;
  if (!data) return "";
  const meses = [
    "janeiro",
    "fevereiro",
    "março",
    "abril",
    "maio",
    "junho",
    "julho",
    "agosto",
    "setembro",
    "outubro",
    "novembro",
    "dezembro",
  ];
  return `${data.getDate()} de ${meses[data.getMonth()]} de ${data.getFullYear()}`;
}
