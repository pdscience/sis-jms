import { inserir } from "@/db";
import type { Usuario } from "@/db/schema";

export type EventoAuditoria = {
  acao: string;
  entidade: string;
  entidadeId?: string | number | null;
  resumo?: string;
  detalhes?: Record<string, unknown>;
  ip?: string | null;
};

/**
 * Trilha de auditoria append-only: nenhum fluxo do sistema atualiza ou
 * remove registros desta tabela (regra reforçada no banco de dados).
 */
export async function registrarAuditoria(
  usuario: Pick<Usuario, "id" | "nome" | "papel"> | null,
  evento: EventoAuditoria,
) {
  await inserir("auditoria", {
    usuarioId: usuario?.id ?? null,
    usuarioNome: usuario?.nome ?? "sistema",
    papel: usuario?.papel ?? null,
    acao: evento.acao,
    entidade: evento.entidade,
    entidadeId: evento.entidadeId != null ? String(evento.entidadeId) : null,
    resumo: evento.resumo ?? null,
    detalhes: evento.detalhes ?? null,
    ip: evento.ip ?? null,
  });
}
