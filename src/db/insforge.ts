import "dotenv/config";
import { createAdminClient } from "@insforge/sdk";

/* Acesso ao Postgres do projeto InsForge via API HTTPS (server-only).
   Toda chamada parte do SSR/API routes com a admin key — sem RLS. */

export function isDbAvailable(): boolean {
  return Boolean(process.env.INSFORGE_URL && process.env.INSFORGE_API_KEY);
}

export class DbIndisponivel extends Error {
  constructor() {
    super("Banco de dados indisponível (INSFORGE_URL/INSFORGE_API_KEY não configurados).");
    this.name = "DbIndisponivel";
  }
}

function admin() {
  const baseUrl = process.env.INSFORGE_URL;
  const apiKey = process.env.INSFORGE_API_KEY;
  if (!baseUrl || !apiKey) throw new DbIndisponivel();
  return createAdminClient({ baseUrl, apiKey });
}

const toCamel = (s: string) => s.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase());
const toSnake = (s: string) => s.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);

function camelRow<T>(row: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) out[toCamel(k)] = v;
  return out as T;
}

function snakeObj(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    out[toSnake(k)] = v instanceof Date ? v.toISOString() : v;
  }
  return out;
}

function msg(error: unknown): string {
  if (!error) return "erro desconhecido";
  if (typeof error === "string") return error;
  const e = error as { message?: string; code?: string };
  return e.message ? `${e.message}${e.code ? ` (${e.code})` : ""}` : JSON.stringify(error).slice(0, 300);
}

export type Ordem = { coluna: string; asc?: boolean };

export type ListaOpts = { order?: Ordem; limit?: number; cols?: string };

function base(table: string) {
  return admin().database.from(table);
}

/** Todas as linhas (opcionalmente ordenadas/limitadas, com colunas). */
export async function all<T>(table: string, opts?: ListaOpts): Promise<T[]> {
  let q = opts?.cols ? base(table).select(opts.cols) : base(table).select();
  if (opts?.order) q = q.order(toSnake(opts.order.coluna), { ascending: opts.order.asc ?? true });
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(`InsForge select ${table}: ${msg(error)}`);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => camelRow<T>(r));
}

/** Linhas com igualdade simples numa coluna. */
export async function porColuna<T>(table: string, coluna: string, valor: unknown, opts?: { order?: Ordem; limit?: number }): Promise<T[]> {
  let q = base(table).select().eq(toSnake(coluna), valor as never);
  if (opts?.order) q = q.order(toSnake(opts.order.coluna), { ascending: opts.order.asc ?? true });
  if (opts?.limit) q = q.limit(opts.limit);
  const { data, error } = await q;
  if (error) throw new Error(`InsForge select ${table}: ${msg(error)}`);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => camelRow<T>(r));
}

/** Uma linha por igualdade, ou null. */
export async function um<T>(table: string, coluna: string, valor: unknown): Promise<T | null> {
  const { data, error } = await base(table).select().eq(toSnake(coluna), valor as never).maybeSingle();
  if (error) throw new Error(`InsForge select-one ${table}: ${msg(error)}`);
  return data ? camelRow<T>(data as Record<string, unknown>) : null;
}

/** Insert (array) com retorno da linha criada. */
export async function inserir<T>(table: string, valores: Record<string, unknown>): Promise<T> {
  const { data, error } = await base(table).insert([snakeObj(valores)]).select();
  if (error) throw new Error(`InsForge insert ${table}: ${msg(error)}`);
  const linha = (data as Record<string, unknown>[] | null)?.[0];
  if (!linha) throw new Error(`InsForge insert ${table}: sem retorno`);
  return camelRow<T>(linha);
}

/** Update por igualdade com retorno das linhas afetadas. */
export async function atualizar<T>(table: string, valores: Record<string, unknown>, coluna: string, valor: unknown): Promise<T[]> {
  const { data, error } = await base(table).update(snakeObj(valores)).eq(toSnake(coluna), valor as never).select();
  if (error) throw new Error(`InsForge update ${table}: ${msg(error)}`);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => camelRow<T>(r));
}

/** Insert em lote com retorno das linhas criadas. */
export async function inserirVarios<T>(table: string, linhas: Record<string, unknown>[]): Promise<T[]> {
  if (!linhas.length) return [];
  const { data, error } = await base(table).insert(linhas.map(snakeObj)).select();
  if (error) throw new Error(`InsForge insert ${table}: ${msg(error)}`);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => camelRow<T>(r));
}

/** Delete por igualdade com retorno das linhas removidas. Erro se 0 linhas. */
export async function remover<T>(table: string, coluna: string, valor: unknown): Promise<T[]> {
  const { data, error } = await base(table).delete().eq(toSnake(coluna), valor as never).select();
  if (error) throw new Error(`InsForge delete ${table}: ${msg(error)}`);
  const linhas = ((data ?? []) as Record<string, unknown>[]).map((r) => camelRow<T>(r));
  if (!linhas.length) throw new Error(`InsForge delete ${table}: nenhum registro encontrado.`);
  return linhas;
}

/** Contagem exata de linhas. */
export async function contar(table: string): Promise<number> {
  const { count, error } = await base(table).select("id", { count: "exact" }).limit(1);
  if (error) throw new Error(`InsForge count ${table}: ${msg(error)}`);
  return count ?? 0;
}
