import type { APIContext } from "astro";
import { comSessao, encerrarSessao, iniciarSessao, usuarioAtual } from "./auth.js";

type Ctx = Pick<APIContext, "cookies" | "request">;

function ipDe(ctx: Ctx): string | null {
  const h = ctx.request.headers;
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
}

/** Roda `fn` com sessão (cookie) + IP da requisição Astro. */
export function comSessaoAstro<T>(ctx: Ctx, fn: () => T): T {
  const token = ctx.cookies.get("jis_sessao")?.value;
  return comSessao(token, ipDe(ctx), fn);
}

/** Usuário logado ou null (nunca explode sem DB). */
export async function getSessionUser(ctx: Ctx) {
  return comSessaoAstro(ctx, () => usuarioAtual());
}

export function setSessionCookie(ctx: Pick<APIContext, "cookies">, userId: number) {
  iniciarSessao(
    {
      set: (n, v, o) => ctx.cookies.set(n, v, o as never),
      delete: (n) => ctx.cookies.delete(n, { path: "/" }),
    },
    userId,
  );
}

export function clearSessionCookie(ctx: Pick<APIContext, "cookies">) {
  encerrarSessao({ set: () => undefined, delete: (n) => ctx.cookies.delete(n, { path: "/" }) });
}
