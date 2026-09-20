import { cpSync, existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from "node:fs";

/* Monta o layout que o Cloudflare Pages entende (modo avançado):
   dist/_worker.js/index.js = worker SSR + dist/_routes.json.
   O entry gerado pelo adapter já é Module Worker com fallback p/ env.ASSETS. */
const SRV = "dist/server";
const DST = "dist/_worker.js";

if (!existsSync(`${SRV}/entry.mjs`)) {
  console.error("pages-worker: dist/server/entry.mjs não encontrado; rode astro build antes.");
  process.exit(1);
}
rmSync(DST, { recursive: true, force: true });
mkdirSync(DST, { recursive: true });
cpSync(SRV, DST, { recursive: true });
renameSync(`${DST}/entry.mjs`, `${DST}/index.js`);
rmSync(`${DST}/wrangler.json`, { force: true }); // só faz sentido p/ `wrangler deploy`
writeFileSync(
  "dist/_routes.json",
  JSON.stringify({
    version: 1,
    include: ["/*"],
    exclude: ["/_astro/*", "/estilos.css", "/favicon.ico", "/.assetsignore"],
  }),
);
console.log("pages-worker: dist/_worker.js + _routes.json prontos.");
