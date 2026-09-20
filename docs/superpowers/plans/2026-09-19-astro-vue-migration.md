# SIS-JIS Astro+Vue Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar in-place o SIS-JIS de Next.js+React para Astro SSR + ilhas Vue, mantendo Drizzle/Postgres e deixando `dev` + `build` funcionais sem DB.

**Architecture:** Astro `output: server` + adapter Node standalone; páginas `.astro` fazem SSR chamando `src/server/consultas.ts` direto; Server Actions viram Astro Actions + POST; componentes React viram SFC Vue com `client:load`/`client:visible`.

**Tech Stack:** Astro 5, @astrojs/vue, @astrojs/node, Vue 3.5, @nanostores/vue, TailwindCSS 4 (existente), Drizzle ORM 0.45.2 + pg 8.20.0, pdf-lib, TypeScript 5.9.

**Spec:** `docs/superpowers/specs/2026-09-19-astro-vue-migration-design.md`

## Global Constraints

- Manter Postgres + Drizzle com o mesmo schema em `src/db/schema.ts` — nenhuma mudança de tabela.
- Preservar RBAC/sigilo: perfil `pessoal` vê só atas homologadas/publicadas, sem CID/arquivo/detalhe clínico.
- Preservar mensagens PT-BR e classes Tailwind `campo/ouro` de `src/app/globals.css`.
- `npm run dev` e `npm run build` devem passar sem Postgres rodando (rotas toleram DB ausente).
- Tipo `ResultadoAcao = { ok: boolean; erro?: string; sucesso?: string; id?: number }` preservado em todas as actions.
- Cookie de sessão `jis_sessao` (HMAC) preservado.

---

### Task 1: Base Astro + configs + layouts + CSS

**Files:**
- Create: `astro.config.mjs`, `src/layouts/Base.astro`, `src/layouts/AppLayout.astro`, `src/middleware.ts`, `src/styles/globals.css`
- Modify: `package.json`, `tsconfig.json`
- Test: `scripts/verify-base.mjs`

**Interfaces:**
- Consumes: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`
- Produces: `Base.astro` (props: `{ titulo?: string }` + `<slot />`), `AppLayout.astro` (props: `{ usuario: {id,nome,papel,posto,crm}, contadores: {rotulo,valor}[] }` + `<slot />`), `middleware.ts` export `onRequest`

- [ ] **Step 1: Instalar dependências Astro/Vue e remover Next/React**

Run:
```bash
npm i astro @astrojs/vue @astrojs/node vue @nanostores/vue
npm rm next react react-dom eslint-config-next @nanostores/react @types/react @types/react-dom
```

- [ ] **Step 2: Criar `astro.config.mjs`**

```js
import { defineConfig } from "astro/config";
import vue from "@astrojs/vue";
import node from "@astrojs/node";

export default defineConfig({
  output: "server",
  adapter: node({ mode: "standalone" }),
  integrations: [vue()],
});
```

- [ ] **Step 3: Mover CSS global**

Run: `cp src/app/globals.css src/styles/globals.css` (manter conteúdo `@import "tailwindcss"` + `@theme campo/ouro` intacto).

- [ ] **Step 4: Criar `src/layouts/Base.astro`**

```astro
---
import "../styles/globals.css";
const { titulo = "SIS-JIS | Junta de Inspeção de Saúde" } = Astro.props;
---
<html lang="pt-BR">
  <head><meta charset="utf-8" /><title>{titulo}</title></head>
  <body class="bg-campo-50 text-campo-950 antialiased"><slot /></body>
</html>
```

- [ ] **Step 5: Criar `src/middleware.ts` (auth global tolerante a DB ausente)**

```ts
import type { MiddlewareHandler } from "astro";
import { lerToken } from "./lib/auth-context.js";

const PUBLICAS = ["/login", "/envio-atestado", "/api/health"];
export const onRequest: MiddlewareHandler = async (ctx, next) => {
  if (PUBLICAS.some((p) => ctx.url.pathname.startsWith(p))) return next();
  const token = ctx.cookies.get("jis_sessao")?.value;
  if (!lerToken(token)) return ctx.redirect("/login?falha=1");
  return next();
};
```

- [ ] **Step 6: Atualizar `package.json` scripts e verificar**

```json
{ "scripts": { "dev": "astro dev", "build": "astro build", "start": "node ./dist/server/entry.mjs", "typecheck": "astro check" } }
```

Run: `npm run dev -- --port 4321` smoke (Ctrl+C após subir), depois `npm run build`. Expected: build passa mesmo sem DB.

---

### Task 2: Auth adaptada (sem next/headers) + login funcional

**Files:**
- Create: `src/lib/auth-context.ts`, `src/pages/index.astro`, `src/pages/login.astro`, `src/components/FormularioLogin.vue`, `src/actions/auth.ts`
- Modify: `src/lib/auth.ts`
- Test: `scripts/verify-auth.mjs`

**Interfaces:**
- Consumes: `src/lib/auth.ts` (`hashSenha`, `verificarSenha`, `criarToken`, `lerToken`), `src/server/auth-actions.ts` (`entrar`, `sair`), `src/components/FormularioLogin.tsx`
- Produces: `auth-context.ts` exports `getSessionUser(event)`, `setSessionCookie(event,userId)`, `clearSessionCookie(event)`; `actions/auth.ts` exports `entrar(data: {login,senha}) => Promise<ResultadoAcao>`

- [ ] **Step 1: Criar `src/lib/auth-context.ts` (substitui next/headers)**

```ts
import type { APIContext } from "astro";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { criarToken, lerToken } from "./auth.js";

export async function getSessionUser(ctx: { cookies: APIContext["cookies"] }) {
  try {
    const id = lerToken(ctx.cookies.get("jis_sessao")?.value);
    if (!id) return null;
    const [u] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
    return u?.ativo ? u : null;
  } catch { return null; }
}
export function setSessionCookie(ctx: { cookies: APIContext["cookies"] }, userId: number) {
  ctx.cookies.set("jis_sessao", criarToken(userId), { httpOnly: true, path: "/", maxAge: 43200 });
}
```

- [ ] **Step 2: Adaptar `src/lib/auth.ts` — remover imports `next/headers` e `react/cache`, manter `hashSenha/verificarSenha/criarToken/lerToken/AcessoNegado` puros**

Remover linhas `import { cookies, headers } from "next/headers"` e `import { cache } from "react"`; `iniciarSessao/encerrarSessao/usuarioAtual/ipAtual` passam a receber contexto (delegar para `auth-context.ts`).

- [ ] **Step 3: Criar `src/actions/auth.ts` a partir de `src/server/auth-actions.ts:25-58`**

Mesma lógica `entrar` (busca por login+ativo, `verificarSenha`, update `ultimoAcesso`, `registrarAuditoria` com try/catch sem DB), retorna `ResultadoAcao`, sem `redirect` do Next — o `.astro` redireciona.

- [ ] **Step 4: Criar `src/components/FormularioLogin.vue` (port de `FormularioLogin.tsx:16-103`)**

```vue
<script setup lang="ts">
import { ref } from "vue";
const erro = ref("");
async function onSubmit(e: Event) {
  const fd = new FormData(e.target as HTMLFormElement);
  const r = await fetch("/api/auth/entrar", { method: "POST", body: fd });
  const j = await r.json();
  if (j.ok) location.href = "/painel"; else erro.value = j.erro ?? "Falha no login.";
}
function preencher(login: string) {
  (document.querySelector('[name=login]') as HTMLInputElement).value = login;
  (document.querySelector('[name=senha]') as HTMLInputElement).value = "jis123";
}
</script>
<template>
  <form @submit.prevent="onSubmit" class="space-y-5">
    <p v-if="erro" class="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{{ erro }}</p>
    <input name="login" required placeholder="ex.: presidente" class="w-full rounded-lg border px-3 py-2" />
    <input name="senha" type="password" required placeholder="••••••" class="w-full rounded-lg border px-3 py-2" />
    <button class="w-full rounded-lg bg-campo-700 px-4 py-2 font-semibold text-white">Entrar no SIS-JIS</button>
  </form>
</template>
```

- [ ] **Step 5: Criar `src/pages/login.astro` + `src/pages/index.astro` e verificar**

`login.astro` usa `Base.astro` + `FormularioLogin client:load`; `index.astro` redireciona por sessão. Run: `node scripts/verify-auth.mjs` (checa arquivos existem e `lerToken(criarToken(1)) === 1`).

---

### Task 3: Shell/Sidebar/UI/Icones em Vue + AppLayout

**Files:**
- Create: `src/components/ShellAplicacao.vue`, `src/components/Sidebar.vue`, `src/components/BarraSuperior.vue`, `src/components/ui.vue` (ou `ui.ts` + SFCs), `src/components/Icones.vue`
- Modify: `src/layouts/AppLayout.astro`, `src/stores/junta.ts` (nada muda na store; só consumers)
- Test: `npm run build`

**Interfaces:**
- Consumes: `src/components/ShellAplicacao.tsx:7-15`, `Sidebar.tsx` (`UsuarioSessao`), `ui.tsx:30-46 Badge`, `85-120 Card`, helpers `tom*/rotulo*/classeInput/classeBotaoPrimario`
- Produces: componentes Vue com mesmos props/classes; `AppLayout.astro` chama `ensureSeed()` em try/catch + `getSessionUser` + contadores pendente/em_analise

- [ ] **Step 1: Portar `ui.tsx` — copiar `TOM_BADGE`, `tomStatusAtestado`, `tomParecer`, `tomNivel`, `tomStatusAta`, `Badge`, `Card`, `StatCard`, `Campo`, `Barra`, `Aviso`, `Vazio`, `CabecalhoPagina` para Vue com mesmos classNames**

- [ ] **Step 2: Portar `Icones.tsx` para `Icones.vue` (mesmos paths SVG, props `class`)**

- [ ] **Step 3: Portar `ShellAplicacao/Sidebar/BarraSuperior` (estado `menuAberto` via `ref(false)`)**

- [ ] **Step 4: `AppLayout.astro` com `ensureSeed().catch(()=>{})` + contadores via `db.select({status})` em try/catch (fallback `[]`)**

- [ ] **Step 5: Verificar**

Run: `npm run build`. Expected: PASS sem DB.

---

### Task 4: Painel + Militares

**Files:**
- Create: `src/pages/painel/index.astro`, `src/pages/militares/index.astro`, `src/pages/militares/novo.astro`, `src/pages/militares/[id].astro`, `src/pages/militares/[id]/editar.astro`, `src/components/FormularioMilitar.vue`, `src/components/AcoesMilitar.vue`, `src/actions/militar.ts`
- Modify: —
- Test: `npm run build`

**Interfaces:**
- Consumes: `obterPainel()` em `src/server/consultas.ts:104-183`, `listarMilitares/perfilMilitar` (`185-286`), `src/server/militar-actions.ts`
- Produces: páginas `.astro` SSR (try/catch DB → estado vazio/"Banco indisponível"); `FormularioMilitar.vue` POST para action; mesma tabela/cards do `painel/page.tsx` e `militares/page.tsx`

- [ ] **Step 1: Criar actions militar (port direto de `militar-actions.ts`, trocar `revalidatePath` por retorno `ResultadoAcao`)**

- [ ] **Step 2: Criar `painel/index.astro` (KPIs, alertas, fila, atas recentes — port de `(app)/painel/page.tsx:35-375`)**

- [ ] **Step 3: Criar páginas militares + `FormularioMilitar.vue` + `AcoesMilitar.vue`**

- [ ] **Step 4: Verificar**

Run: `npm run build`. Expected: PASS; abrir `/painel` sem DB mostra aviso, não 500.

---

### Task 5: Atestados + envio público

**Files:**
- Create: `src/pages/atestados/index.astro`, `src/pages/atestados/[id].astro`, `src/pages/envio-atestado.astro`, `src/components/FormularioAtestado.vue`, `src/components/AcoesAtestado.vue`, `src/actions/atestado.ts`, `src/pages/api/atestados/[id]/arquivo.ts`
- Modify: —
- Test: `npm run build`

**Interfaces:**
- Consumes: `filaAtestados/detalheAtestado` (`consultas.ts:288-376`), `src/server/atestado-actions.ts`, `src/app/api/atestados/[id]/arquivo/route.ts`, `src/app/envio-atestado/page.tsx:1-82`
- Produces: mesmas rotas em Astro; endpoint arquivo retorna `Response` com `arquivoBase64` decodificado, bloqueado para papel `pessoal`

- [ ] **Step 1: Actions atestado (port direto, `ResultadoAcao`)**

- [ ] **Step 2: Páginas atestados + `FormularioAtestado.vue` (upload base64) + `AcoesAtestado.vue`**

- [ ] **Step 3: Endpoint arquivo + página pública `envio-atestado.astro` (sem auth, como no Next)**

- [ ] **Step 4: Verificar**

Run: `npm run build`. Expected: PASS.

---

### Task 6: Junta/parecer + Atas + PDFs

**Files:**
- Create: `src/pages/junta/index.astro`, `src/pages/junta/parecer.astro`, `src/pages/atas/index.astro`, `src/pages/atas/[id].astro`, `src/components/FormularioParecer.vue`, `src/components/AcoesAta.vue`, `src/components/BotaoConvocacoes.vue`, `src/actions/junta.ts`, `src/pages/api/atas/[id]/pdf.ts`
- Modify: —
- Test: `npm run build`

**Interfaces:**
- Consumes: `casosParaJunta/listaAtas/detalheAta` (`consultas.ts:378-519`), `src/server/junta-actions.ts`, `src/server/prazo-actions.ts`, `src/lib/ata.ts` (`secoesDaAta/extratoParaBI`), `src/lib/pdf.ts`, `src/app/api/atas/[id]/pdf/route.ts`, `stores/junta.ts` (`$rascunhoParecer`, `definirCampoParecer`, `$periodoConcedido`)
- Produces: `FormularioParecer.vue` usa `@nanostores/vue` (`useStore($rascunhoParecer)`); PDF endpoint retorna `application/pdf`

- [ ] **Step 1: `FormularioParecer.vue` com nanostores-vue + actions junta/prazo**

```vue
<script setup lang="ts">
import { useStore } from "@nanostores/vue";
import { $rascunhoParecer, $periodoConcedido } from "../stores/junta.js";
const rascunho = useStore($rascunhoParecer);
const dias = useStore($periodoConcedido);
</script>
```

- [ ] **Step 2: Páginas junta + atas + `AcoesAta.vue` + `BotaoConvocacoes.vue`**

- [ ] **Step 3: Endpoint `api/atas/[id]/pdf.ts` (port do route.ts, `pdf-lib`, respeitar sigilo `pessoal`)**

- [ ] **Step 4: Verificar**

Run: `npm run build`. Expected: PASS.

---

### Task 7: Prazos, relatórios, auditoria, usuários + APIs restantes + limpeza

**Files:**
- Create: `src/pages/prazos/index.astro`, `src/pages/relatorios/index.astro`, `src/pages/auditoria/index.astro`, `src/pages/usuarios/index.astro`, `src/components/FormularioUsuario.vue`, `src/pages/api/health.ts`, `src/pages/api/relatorios/pessoal.ts`, `src/pages/api/auth/entrar.ts`, `src/pages/api/auth/sair.ts`
- Modify: `package.json` (remover scripts next), deletar `src/app/**`, `next.config.ts`, `eslint.config.mjs` (ajustar), `tsconfig.json` (paths `@/*`, `jsx: react-jsx` → `vue-jsx` + tipos astro)
- Test: `scripts/verify-final.mjs`

**Interfaces:**
- Consumes: `listaPrazos/relatorioPessoal/listaAuditoria/listaUsuarios` (`consultas.ts:521-646`), `src/server/auth-actions.ts:75-158`, `src/app/api/health/route.ts`, `src/app/api/relatorios/pessoal/route.ts`
- Produces: páginas SSR + endpoints JSON/PDF; repo sem imports `next/*` ou `react`

- [ ] **Step 1: Páginas prazos/relatórios/auditoria/usuários + `FormularioUsuario.vue` (só admin cria, como `auth-actions.ts:75-128`)**

- [ ] **Step 2: Endpoints `api/health`, `api/relatorios/pessoal`, `api/auth/entrar|sair`**

- [ ] **Step 3: Deletar Next e atualizar configs**

Run:
```bash
rm -rf src/app next.config.ts
rg -l "from \"next|from 'next|require\(\"next|useActionState|use client" src || echo "SEM-IMPORTS-NEXT"
```

Expected: `SEM-IMPORTS-NEXT`.

- [ ] **Step 4: Verificação final**

```bash
npm run build
node scripts/verify-final.mjs
```

`verify-final.mjs` checa: `dist/` existe; nenhuma ocorrência de `next/` em `src/`; `FormularioLogin.vue`, `painel/index.astro`, `api/atas/[id]/pdf.ts` existem.

---

## Self-Review

1. Spec coverage: base/configs (Task 1), auth-context+login (Task 2), shell/UI (Task 3), painel/militares (Task 4), atestados/envio (Task 5), junta/atas/PDF (Task 6), prazos/relatórios/auditoria/usuários+limpeza (Task 7) — cobre todas as rotas do glob `src/app/**` e todos os componentes `src/components/*`.
2. Placeholder scan: nenhum TBD/TODO; comandos `npm`/`rg`, código Vue/Astro/TS e caminhos exatos incluídos; `verify-*.mjs` descritos com asserts concretos.
3. Type consistency: `ResultadoAcao`, `UsuarioSessao {id,nome,papel,posto,crm}`, contadores `{rotulo,valor}[]`, stores `$rascunhoParecer/$periodoConcedido` com mesmos nomes em Task 3 e Task 6; `lerToken/criarToken` reutilizados em Task 1 e 2.
