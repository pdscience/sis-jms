import { createHmac, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { AsyncLocalStorage } from "node:async_hooks";
import { um } from "@/db";
import type { Usuario } from "@/db/schema";
import { ACESSO_SIGILO, type Papel } from "@/lib/dominio";

const COOKIE = "jis_sessao";
const SEGREDO =
  process.env.SESSION_SECRET ?? "jis-mvp-segredo-local-trocar-em-producao";

export const NOME_COOKIE_SESSAO = COOKIE;

type SessaoCtx = { token?: string; ip?: string | null; usuario?: Usuario | null };
const sessaoStore = new AsyncLocalStorage<SessaoCtx>();

/** Executa `fn` com o contexto de sessão da requisição atual. */
export function comSessao<T>(token: string | undefined, ip: string | null, fn: () => T): T {
  if (sessaoStore.getStore()) return fn(); // reaproveita o contexto (e o memo) da requisição
  return sessaoStore.run({ token, ip }, fn);
}

function tokenAtual(): string | undefined {
  return sessaoStore.getStore()?.token;
}

export function hashSenha(senha: string): string {
  const salt = randomUUID().slice(0, 8);
  const derivada = scryptSync(senha, salt, 32).toString("hex");
  return `${salt}$${derivada}`;
}

export function verificarSenha(senha: string, hash: string): boolean {
  const [salt, esperado] = hash.split("$");
  if (!salt || !esperado) return false;
  const derivada = scryptSync(senha, salt, 32).toString("hex");
  const a = Buffer.from(derivada, "hex");
  const b = Buffer.from(esperado, "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

function assinar(valor: string): string {
  return createHmac("sha256", SEGREDO).update(valor).digest("base64url");
}

export function criarToken(usuarioId: number): string {
  const payload = `${usuarioId}.${Date.now()}`;
  return `${payload}.${assinar(payload)}`;
}

export function lerToken(token: string | undefined): number | null {
  if (!token) return null;
  const partes = token.split(".");
  if (partes.length !== 3) return null;
  const [id, criadoEm, assinatura] = partes;
  if (assinatura !== assinar(`${id}.${criadoEm}`)) return null;
  const idade = Date.now() - Number(criadoEm);
  if (Number.isNaN(idade) || idade > 1000 * 60 * 60 * 12) return null;
  const usuarioId = Number(id);
  return Number.isFinite(usuarioId) ? usuarioId : null;
}

export type CookieJar = {
  set: (nome: string, valor: string, opts: Record<string, unknown>) => void;
  delete: (nome: string) => void;
};

export function iniciarSessao(cookies: CookieJar, usuarioId: number) {
  const producao = process.env.NODE_ENV === "production";
  cookies.set(COOKIE, criarToken(usuarioId), {
    httpOnly: true,
    sameSite: producao ? "none" : "lax",
    secure: producao,
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export function encerrarSessao(cookies: CookieJar) {
  cookies.delete(COOKIE);
}

/** Usuário autenticado da requisição atual (memoizado por request via ALS). */
export async function usuarioAtual(): Promise<Usuario | null> {
  const store = sessaoStore.getStore();
  if (store && "usuario" in store) return store.usuario ?? null;
  try {
    const usuarioId = lerToken(tokenAtual());
    if (!usuarioId) return null;
    const usuario = await um<Usuario>("usuarios", "id", usuarioId);
    if (store) store.usuario = usuario;
    if (!usuario || !usuario.ativo) return null;
    return usuario;
  } catch {
    return null;
  }
}

export class AcessoNegado extends Error {
  constructor(message = "Acesso negado para o seu perfil.") {
    super(message);
    this.name = "AcessoNegado";
  }
}

export async function exigirSessao(): Promise<Usuario> {
  const usuario = await usuarioAtual();
  if (!usuario) throw new AcessoNegado("Sessão expirada. Faça login novamente.");
  return usuario;
}

export async function exigirPapel(...papeis: Papel[]): Promise<Usuario> {
  const usuario = await exigirSessao();
  if (usuario.papel === "admin") return usuario;
  if (!papeis.includes(usuario.papel as Papel)) throw new AcessoNegado();
  return usuario;
}

export function podeVerSigilo(papel: string | null | undefined): boolean {
  return ACESSO_SIGILO.includes(papel as Papel);
}

export async function ipAtual(): Promise<string | null> {
  return sessaoStore.getStore()?.ip ?? null;
}
