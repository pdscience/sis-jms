# Design: Migração Next.js+React → Astro+Vue (SIS-JIS)

Data: 2026-09-19
Status: aprovado pelo usuário (escopo in-place)
Origem: brainstorming path Architectural

## 1. Contexto

Projeto atual: Next.js 16 + React 19 + Drizzle/Postgres (~6600 linhas, 60+ arquivos).
Sistema SIS-JIS: painel, militares, atestados, atas/junta, prazos, relatórios,
auditoria, usuários, login RBAC, PDFs (ata + arquivo atestado), seed demo
(perfis presidente/medico/secretaria/pessoal, senha jis123).

Decisões do usuário:
- Escopo: migração total in-place (apagar Next.js, deixar só Astro+Vue funcional)
- Backend: manter Drizzle + Postgres, mesmo schema
- Frontend: Astro SSR + ilhas Vue (`client:load` / `client:visible`)
- Funcional = `npm run dev` + `npm run build` passam sem exigir Postgres rodando;
  rotas toleram DB ausente com estado "sem banco"; seed/login validados quando DB existir.

## 2. Abordagens consideradas

### A — Astro SSR + ilhas Vue + Astro Actions (escolhida)
- `output: 'server'` + `@astrojs/node standalone`, `@astrojs/vue`.
- Páginas `.astro` chamam `src/server/consultas.ts` direto no SSR.
- Server Actions → Astro Actions + form POST.
- Componentes React → SFC Vue, `nanostores` com `@nanostores/vue`.
- Prós: menor reescrita, mantém auth/RBAC/PDF/seed; SSR preservado.
- Contras: adaptar `next/headers`, `next/cache`, `next/navigation`.

### B — Astro shell + API REST JSON + Vue via fetch (rejeitada)
- Mais código, perde SSR, duplica RBAC/sigilo no cliente.

### C — Astro estático + backend separado (rejeitada)
- Quebra cookie de sessão, PDFs e auditoria; reescrita total.

## 3. Arquitetura alvo

- `astro.config.mjs`: `output: 'server'`, `adapter node standalone`,
  `integrations: [vue(), tailwind()]` (ou via postcss existente).
- `src/pages/`: uma `.astro` por rota atual em `src/app/`:
  - `/` (redirect por sessão), `/login`, `/envio-atestado`
  - `/painel`, `/militares`, `/militares/novo`, `/militares/[id]`, `/militares/[id]/editar`
  - `/atestados`, `/atestados/[id]`, `/atas`, `/atas/[id]`
  - `/junta`, `/junta/parecer`, `/prazos`, `/relatorios`, `/auditoria`, `/usuarios`
- `src/layouts/`: `Base.astro` (substitui `app/layout.tsx`),
  `AppLayout.astro` (substitui `app/(app)/layout.tsx`: seed + auth + contadores + Shell).
- `src/middleware.ts`: auth global (ler cookie `jis_sessao`, redirecionar `/login?falha=1`),
  substitui guards por layout do Next.
- `src/pages/api/`: `health`, `atas/[id]/pdf`, `atestados/[id]/arquivo`,
  `relatorios/pessoal` a partir de `src/app/api/*/route.ts`.
- `src/actions/`: `auth`, `militar`, `atestado`, `junta`, `prazo` a partir de
  `src/server/*-actions.ts`; tipo `ResultadoAcao` preservado.
- `src/components/*.vue`: `ShellAplicacao`, `Sidebar`, `BarraSuperior`,
  `FormularioLogin/Usuario/Militar/Atestado/Parecer`, `AcoesMilitar/Ata/Atestado`,
  `BotaoConvocacoes`, `ui` (Badge/Card/StatCard/Campo/Barra/Aviso/Vazio + helpers
  `classeInput`, `tom*/rotulo*`), `Icones`.
- Lógica pura intacta: `db/schema.ts`, `db/index.ts`, `lib/datas`, `dominio`,
  `prazos`, `ata`, `pdf`, `audit`, `seed`, `server/consultas.ts`.
- Único arquivo com troca de API: `lib/auth.ts`
  (`cookies()`/`headers()` do Next → `Astro.cookies` / `Astro.request.headers`,
  helpers `iniciarSessao/encerrarSessao/usuarioAtual/exigirSessao/exigirPapel/ipAtual`
  recebem contexto Astro).
- Estilos: `globals.css` com `@import "tailwindcss"` + `@theme campo/ouro` mantido,
  importado pelo `Base.astro`.
- Stores: `stores/junta.ts` mantém `nanostores`, consumers Vue usam
  `@nanostores/vue` (`useStore`).

## 4. Componentes e data flow

- SSR: `.astro` → `exigirSessao()` / `obterPainel()` / `listar*()` → props para ilha Vue.
- Interatividade: formulários e tabelas com filtros viram ilhas
  (`client:load` para login/formulários, `client:visible` para tabelas/painel).
- Mutação: `<form method="POST" action={actions.x}>` ou `fetch` para Action;
  retorno `ResultadoAcao { ok, erro?, sucesso?, id? }`; redirect pós-login `/painel`.
- RBAC/sigilo: checagem no SSR (`podeVerSigilo`, `exigirPapel`); perfil `pessoal`
  continua vendo só atas homologadas/publicadas e sem arquivo/CID/detalhe clínico.
- Erro sem DB: wrapper `comBanco()` — falha de conexão renderiza
  `Aviso "Banco indisponível"` + HTTP 200 no dev/build; nunca crashar build.
- PDF: endpoints retornam `Response` com `application/pdf` via `pdf-lib`
  (mesmo `lib/pdf.ts`).

## 5. Error handling

- `AcessoNegado` → redirect `/login` (páginas) ou `{ ok:false, erro }` (actions).
- Validação de forms preservada (mensagens PT-BR atuais).
- `ensureSeed()` idempotente, chamado no layout/middleware; falha silenciosa sem DB.
- Auditoria append-only mantida em toda mutação.

## 6. Testes / validação

- `npm run dev`: home redireciona (`/painel` com sessão, `/login` sem); `/login`
  renderiza sem DB.
- `npm run build` (astro build): passa sem Postgres (mocks/try-catch).
- Com Postgres (`postgresql://postgres:postgres@127.0.0.1:5432/app_db`):
  seed + login `presidente/jis123` → `/painel`; CRUD militar/atestado; PDF ata.
- `tsc --noEmit` limpo para `src/**/*.ts` + `*.vue` (vue-tsc se disponível).

## 7. Riscos e fora de escopo

- Riscos: paridade de `useActionState`→Actions; `revalidatePath`→redirect/reload;
  `next/link`→`<a>`; `next/navigation redirect`→`Astro.redirect`/`Response.redirect`.
- Fora de escopro: trocar banco, mudar visual, novo deploy, testes E2E, i18n.

## 8. Arquivos tocados

- Remover: `next.config.ts`, `eslint-config-next`, `src/app/**`, `@nanostores/react`.
- Criar/editar: `astro.config.mjs`, `package.json`, `tsconfig.json`,
  `src/pages/**.astro`, `src/pages/api/**/*.ts`, `src/layouts/*.astro`,
  `src/middleware.ts`, `src/actions/*.ts`, `src/components/*.vue`,
  `src/lib/auth.ts`, `src/stores/junta.ts` (adapter Vue).
- Manter: `drizzle.config.json`, `src/db/*`, `src/lib/*` (exceto auth),
  `src/server/consultas.ts`, `globals.css` (movido para `src/styles/` ou raiz Astro).

---

## Spec self-review

1. Placeholder scan: nenhum TBD/TODO; rotas e arquivos nomeados explicitamente.
2. Consistência interna: SSR chama consultas direto; mutations via Actions;
   sem contradição com "sem DB no build" (wrapper comBanco cobre ambos).
3. Escopo: único plano (migração in-place); sem decomposição necessária.
4. Ambiguidade: `client:load` vs `client:visible` definido; critério funcional
   mensurável (dev + build sem DB); adapter Node standalone explícito.
