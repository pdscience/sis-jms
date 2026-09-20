import type { MiddlewareHandler } from "astro";
import { lerToken } from "./lib/auth.js";

const PUBLICAS = ["/login", "/envio-atestado", "/api/health", "/api/auth", "/_astro", "/favicon"];

function caminhoPublico(path: string): boolean {
  return PUBLICAS.some((p) => path === p || path.startsWith(p + "/"));
}

export const onRequest: MiddlewareHandler = async (ctx, next) => {
  const path = ctx.url.pathname;
  if (caminhoPublico(path)) {
    return next();
  }
  // Envio público de atestado pelo militar (canal "militar", sem sessão).
  // A action exige sessão para o canal "secretaria" e valida RE+CPF no canal público.
  if (path === "/api/atestados" && ctx.request.method === "POST") return next();
  if (path === "/") return next();
  let token: string | undefined;
  try {
    token = ctx.cookies.get("jis_sessao")?.value;
  } catch {
    token = undefined;
  }
  if (!lerToken(token)) {
    return ctx.redirect("/login?falha=1");
  }
  return next();
};
