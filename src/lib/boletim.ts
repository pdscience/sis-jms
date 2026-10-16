export type ItemGrade = {
  turno: string; observacao: string | null;
  pessoa: { nome: string; postoGraduacao: string | null } | null;
};
export type SetorGrade = { setor: { id: number; nome: string }; itens: ItemGrade[] };
export type DiaGrade = { dia: number; rotulo: string; setores: SetorGrade[] };
export type GradeSemana = { dias: DiaGrade[] };

export type ItemEscalaBoletim = { turno: string; pessoaNome: string; observacao: string | null };
export type SetorEscalaBoletim = { setor: string; itens: ItemEscalaBoletim[] };
export type DiaEscalaBoletim = { dia: number; rotulo: string; setores: SetorEscalaBoletim[] };
export type EscalaBoletim = { semana: string; geradoEm: string; dias: DiaEscalaBoletim[] };
export type SecaoBoletim = { titulo: string; paragrafos: string[] };

const ORDEM_TURNOS = ["manhã", "tarde", "integral", "plantão"];

/** Converte a grade ao vivo da semana no formato congelável do boletim. */
export function montarEscalaBoletim(semana: string, grade: GradeSemana): EscalaBoletim {
  const dias: DiaEscalaBoletim[] = grade.dias.map((d) => ({
    dia: d.dia,
    rotulo: d.rotulo,
    setores: d.setores
      .filter((s) => s.itens.length > 0)
      .map((s) => ({
        setor: s.setor.nome,
        itens: [...s.itens]
          .sort((a, b) => ORDEM_TURNOS.indexOf(a.turno) - ORDEM_TURNOS.indexOf(b.turno))
          .map((it) => ({
            turno: it.turno,
            pessoaNome: it.pessoa
              ? `${it.pessoa.postoGraduacao ? `${it.pessoa.postoGraduacao} ` : ""}${it.pessoa.nome}`
              : "—",
            observacao: it.observacao,
          })),
      })),
  }));
  return { semana, geradoEm: new Date().toISOString(), dias };
}

function emParagrafos(texto: string | null): string[] {
  const limpo = (texto ?? "").trim();
  if (!limpo) return ["Sem registro."];
  return limpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** Seções II–IV como parágrafos para tela e PDF. */
export function secoesTextoBoletim(b: {
  secao2: string | null; secao3: string | null; secao4: string | null;
}): SecaoBoletim[] {
  return [
    { titulo: "II – ORDENS DE SERVIÇO", paragrafos: emParagrafos(b.secao2) },
    { titulo: "III – ASSUNTOS ADMINISTRATIVOS", paragrafos: emParagrafos(b.secao3) },
    { titulo: "IV – COMUNICADOS", paragrafos: emParagrafos(b.secao4) },
  ];
}
