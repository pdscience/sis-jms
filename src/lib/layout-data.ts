import type { APIContext } from "astro";
import { all, isDbAvailable } from "@/db";
import type { Atestado } from "@/db/schema";
import { ensureSeed } from "@/lib/seed";
import { getSessionUser } from "@/lib/auth-context";

export type DadosLayout = {
  usuario: { id: number; nome: string; papel: string; posto: string | null; crm: string | null };
  contadores: { rotulo: string; valor: number }[];
};

/** Dados do shell (seed + sessão + contadores), tolerante a DB ausente. */
export async function dadosLayout(ctx: APIContext): Promise<DadosLayout | null> {
  const [usuario, contadores] = await Promise.all([
    (async () => {
      if (isDbAvailable()) {
        try {
          await ensureSeed();
        } catch {
          /* segue sem seed */
        }
      }
      return getSessionUser(ctx);
    })(),
    (async (): Promise<DadosLayout["contadores"]> => {
      if (!isDbAvailable()) return [];
      try {
        const abertos = await all<Pick<Atestado, "status">>("atestados", { cols: "status" });
        const emAberto = abertos.filter((a) => a.status === "pendente" || a.status === "em_analise");
        return [
          { rotulo: "atestados pendentes", valor: emAberto.filter((a) => a.status === "pendente").length },
          { rotulo: "em análise", valor: emAberto.filter((a) => a.status === "em_analise").length },
        ];
      } catch {
        return [];
      }
    })(),
  ]);
  if (!usuario) return null;
  return {
    usuario: { id: usuario.id, nome: usuario.nome, papel: usuario.papel, posto: usuario.posto, crm: usuario.crm },
    contadores,
  };
}
