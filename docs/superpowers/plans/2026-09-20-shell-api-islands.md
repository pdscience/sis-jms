# Shell Astro + Dados via API — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Páginas abrem a casca na hora e os quadros carregam via API, sem SSR de dados por clique.

**Architecture:** Páginas `.astro` entregam só shell (usuário/contadores via `dadosLayout`, 1 lote) + ilha Vue `*View.vue` que busca JSON ao montar, com skeleton "Carregando…". Novos endpoints GET em `src/pages/api/*` chamam `consultas.ts` (sessão/RBAC inalterados). Guardas de perfil continuam no SSR do shell. POSTs, formulários e middleware inalterados.

**Tech Stack:** Astro 7 (ClientRouter mantido), Vue 3.5 islands `client:load`, @insforge/sdk (server-only), Tailwind 4.

**Spec:** aprovado em chat em 2026-09-20 (12 endpoints GET; 14 views; fases 1–2).

## Global Constraints

- Nenhuma mudança em autenticação, RBAC/sigilo, POSTs, middleware ou seed.
- Endpoints GET reutilizam `consultas.ts` dentro de `comSessaoAstro`; retornam 401 sem sessão, 302 nunca (fetch não segue bem redirect p/ JSON — usar `redirect: "manual"`? Não: endpoints checam sessão e retornam JSON 401).
- JSON só com tipos primitivos (linhas já são string/number/boolean/null).
- `npm run build` + `npm run typecheck` (0 erros) após cada task.
- Casca < 500ms TTFB; views com `Carregando…` visível.

---

### Task 1: Endpoints GET JSON ( Fase 1: painel, militares, atestados )

**Files:**
- Create: `src/pages/api/painel.ts`, `src/pages/api/militares/index.ts` (lista; query busca/situacao), `src/pages/api/militares/[id].ts`, `src/pages/api/atestados/index.ts` (lista; query status/busca/novo não precisa), `src/pages/api/atestados/[id].ts`
- Test: curl com cookie de sessão

**Interfaces:**
- Consumes: `obterPainel`, `listarMilitares`, `perfilMilitar`, `filaAtestados`, `detalheAtestado`, `listaMilitaresSimples` de `src/server/consultas.js`; `comSessaoAstro`, `getSessionUser` de `src/lib/auth-context.js`
- Produces: GET → `Response.json({ ok: true, dados })` ou `{ ok: false, erro }` (401 sem sessão, 404 quando detalhe null, 503 sem DB)

- [ ] **Step 1: Criar os 5 endpoints**

```ts
// src/pages/api/painel.ts
import type { APIRoute } from "astro";
import { obterPainel } from "../../../server/consultas.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    if (!(await getSessionUser(ctx))) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      return Response.json({ ok: true, dados: await obterPainel() });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar painel." }, { status: 500 });
    }
  });
```

(Repetir o padrão p/ militares/index.ts com `Astro.url.searchParams`, militares/[id].ts com `ctx.params.id` + 404, atestados/index.ts, atestados/[id].ts. atestados/index inclui também `militares: listaMilitaresSimples()` e `papel` do usuário p/ botões condicionais.)

- [ ] **Step 2: Build**

Run: `npm run build`
Expected: Complete!

- [ ] **Step 3: Verificar endpoints com sessão**

Run: login via curl (salva cookie), depois `curl -b jar http://127.0.0.1:PORT/api/painel` etc.
Expected: `{ ok: true, dados: {...} }` nos 5; 401 sem cookie.

### Task 2: PainelView.vue + shell do painel

**Files:**
- Create: `src/components/PainelView.vue`
- Modify: `src/pages/painel/index.astro` (só shell + `<PainelView client:load />`)
- Test: curl + navegador (skeleton aparece, depois dados)

**Interfaces:**
- Consumes: `GET /api/painel`; kit (`Badge, Barra, Card, StatCard, Vazio, Aviso, CabecalhoPagina, Icone, BotaoConvocacoes`); `PAPEL_LABEL`, `LIMITE_AGREGACAO_DIAS`, `formatBR/formatDataHora`, helpers `tom*/rotulo*` de `ui.js`
- Produces: nada (ilha folha)

- [ ] **Step 1: Criar PainelView.vue** — `ref` loading/erro/painel/usuario; `onMounted(fetch)`; template = port 1:1 do markup atual da página usando os mesmos componentes (props passam a vir de `painel.value`). `ehPessoal/ehMedico` derivados de `painel.usuario.papel`.
- [ ] **Step 2: Enxugar painel/index.astro** — mantém `dadosLayout` + redirect + `CabecalhoPagina`? Não: cabeçalho vai p/ a View (depende de perfil). Shell mínimo: `<AppLayout><PainelView client:load /></AppLayout>`.
- [ ] **Step 3: Build + typecheck**

Run: `npm run build`, `npm run typecheck`
Expected: Complete!, 0 errors

- [ ] **Step 4: Medir**

Run: `curl -o /dev/null -w "%{time_total}" http://.../painel` (sem cookie → 302 rápido; com cookie → casca < 0.5s) e conferir `Carregando` no HTML.
Expected: casca TTFB < 0.5s.

### Task 3: MilitaresView + DetalheMilitarView + shells

**Files:**
- Create: `src/components/MilitaresView.vue`, `src/components/DetalheMilitarView.vue`
- Modify: `src/pages/militares/index.astro`, `src/pages/militares/[id].astro` (shells; guards `podeCadastrar` via `layout.usuario.papel` continuam no SSR)
- Test: build + curl + filtro GET multicultural

**Interfaces:**
- Consumes: `GET /api/militares?busca=&situacao=`, `GET /api/militares/[id]`; `AcoesMilitar`, `AcoesConvocacao`, kit; `SITUACAO_MILITAR_LABEL`
- Produces: nada (ilhas folha)

Mesmos 4 steps da Task 2 (criar, enxugar, build+check, medir). Filtros da lista viram GET com query (troca de URL = ClientRouter, histórico preservado) — filtro local após primeira carga é alternativa; usar query+refetch (simples, consistente com hoje).

### Task 4: AtestadosView + DetalheAtestadoView + shells

Idem Task 3 com `GET /api/atestados?status=&busca=`, `GET /api/atestados/[id]`, `AcoesAtestado`, `FormularioAtestado` (novo=1 continua SSR-condicional? O card de inserção usa `militares` da API → mover p/ dentro da View, exibido quando `?novo=1` via prop `mostrarNovo` lida da URL no SSR e passada à ilha).

### Task 5: Fase 2 — endpoints + views restantes

Endpoints: `junta/casos`, `atas`, `atas/[id]`, `prazos`, `relatorios`, `auditoria`, `usuarios`. Views: `JuntaView`, `AtasView`, `AtaDetalheView`, `PrazosView`, `RelatoriosView`, `AuditoriaView`, `UsuariosView`. `junta/parecer`, `militares/novo`, `militares/[id]/editar`, `envio-atestado`, `login` ficam SSR (formulários; `parecer` mantém fetch SSR atual). Relatórios CSV e PDF da ata continuam endpoints de arquivo. Mesmos 4 steps por grupo, build+check no fim, sweep completo + login.

## Self-Review

1. Spec coverage: 12 endpoints (tasks 1+5), 11 views (tasks 2–5; parecer/novo/editar/envio/login permanecem SSR por serem formulários — cobre as 14 páginas interativas + 5 formulários).
2. Placeholder scan: sem TBD/TODO; código e comandos exatos.
3. Type consistency: `{ ok, dados/erro }` em todos os GET; `militarIdInicial: number | null`; views consomem `dados.*` com os mesmos tipos de `consultas.ts`.
