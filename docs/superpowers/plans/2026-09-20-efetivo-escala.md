# Efetivo e Escala de Serviço — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Diretor controla o efetivo da Junta e monta a escala semanal por setor; todos logados consultam.

**Architecture:** Migration com `setores`, `efetivo`, `escalas` (+ seed dos 6 setores); tipos em `src/db/schema.ts`; consultas em `src/server/efetivo.ts`; actions em `src/actions/efetivo.ts`; endpoints GET/POST em `src/pages/api/{efetivo,setores,escalas}.*`; ilhas `EfetivoView`, `FormularioEfetivo`, `EscalaView`, `FormularioEscala` + shells `/efetivo`, `/escala` e item na Sidebar. Escrita só `admin`; resto segue o padrão shell+API vigente.

**Tech Stack:** Astro 7, Vue 3.5 (`client:load`), @insforge/sdk server-only via `src/db/insforge.ts` (`all, porColuna, um, inserir, inserirVarios, atualizar`), Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-09-20-efetivo-escala-design.md`

## Global Constraints

- Leitura: qualquer sessão válida; escrita: `exigirPapel("admin")` → 403 demais.
- Auditoria em toda mutação (`REGISTRAR_EFETIVO`, `EDITAR_EFETIVO`, `STATUS_EFETIVO`, `SETOR_CRIAR`, `SETOR_EDITAR`, `EMITIR_ESCALA`, `REMOVER_ESCALA`).
- `semana` = data (YYYY-MM-DD) da segunda-feira; `dia` 0–6 = segunda–domingo; turnos fixos `manhã|tarde|integral|plantão`.
- Vínculo a militar copia `nome`/`posto_graduacao` (não referência viva).
- Unique `(semana, dia, turno, setor_id, efetivo_id)` em `escalas`.
- `npm run build` + `npm run typecheck` (0 erros) após cada task.

---

### Task 1: Migration + tipos + seed de setores

**Files:**
- Create: `migrations/<versão>_efetivo-escala.sql` (via `npx -y @insforge/cli db migrations new efetivo-escala`)
- Modify: `src/db/schema.ts` (adiciona `Setor`, `Efetivo`, `Escala`)
- Test: `npx -y @insforge/cli db tables` + `db query` de contagem

**Interfaces:**
- Consumes: nada (primeira task)
- Produces: tabelas `setores`, `efetivo`, `escalas`; tipos `Setor/Efetivo/Escala` (camelCase, timestamps `string`); `ensureSetores()` em `src/lib/seed.ts` (idempotente: insere os 6 se houver zero)

- [ ] **Step 1: Criar migration e aplicar**

Run: `npx -y @insforge/cli db migrations new efetivo-escala`
Escrever o SQL (sem BEGIN/COMMIT):

```sql
CREATE TABLE setores (
  id SERIAL PRIMARY KEY,
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE efetivo (
  id SERIAL PRIMARY KEY,
  militar_id INTEGER REFERENCES militares (id) ON DELETE SET NULL,
  nome TEXT NOT NULL,
  posto_graduacao TEXT,
  funcao TEXT,
  telefone TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE escalas (
  id SERIAL PRIMARY KEY,
  semana DATE NOT NULL,
  dia SMALLINT NOT NULL CHECK (dia BETWEEN 0 AND 6),
  turno TEXT NOT NULL CHECK (turno IN ('manhã', 'tarde', 'integral', 'plantão')),
  setor_id INTEGER NOT NULL REFERENCES setores (id) ON DELETE CASCADE,
  efetivo_id INTEGER NOT NULL REFERENCES efetivo (id) ON DELETE CASCADE,
  observacao TEXT,
  criado_por INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX escalas_semana_uidx ON escalas (semana, dia, turno, setor_id, efetivo_id);
```

Run: `npx -y @insforge/cli db migrations up --all`
Expected: `✓ Applied 1 migration file(s).`

- [ ] **Step 2: Adicionar tipos a `src/db/schema.ts`**

```ts
export type Setor = { id: number; nome: string; descricao: string | null; ativo: boolean };
export type Efetivo = {
  id: number; militarId: number | null; nome: string; postoGraduacao: string | null;
  funcao: string | null; telefone: string | null; ativo: boolean;
  criadoEm: string; atualizadoEm: string;
};
export type Escala = {
  id: number; semana: string; dia: number; turno: string; setorId: number;
  efetivoId: number; observacao: string | null; criadoPor: number | null; criadoEm: string;
};
```

- [ ] **Step 3: `ensureSetores()` em `src/lib/seed.ts`**

```ts
import { contar, inserirVarios } from "@/db";
const SETORES_PADRAO = ["Recepção", "Secretaria", "Sala Médica", "Arquivo", "Perícia", "Direção"];
export async function ensureSetores(): Promise<void> {
  if (await contar("setores") > 0) return;
  await inserirVarios("setores", SETORES_PADRAO.map((nome) => ({ nome })));
}
```

Chamar `ensureSetores()` dentro de `carregarEfetivo()` (Task 2), não no seed global.

- [ ] **Step 4: Verificar**

Run: `npx -y @insforge/cli db tables` (mostra `setores, efetivo, escalas`), `npm run typecheck`
Expected: tabelas listadas; 0 errors

### Task 2: Consultas + actions + endpoints

**Files:**
- Create: `src/server/efetivo.ts`, `src/actions/efetivo.ts`, `src/pages/api/efetivo.ts`, `src/pages/api/setores.ts`, `src/pages/api/escalas.ts`
- Test: curl com cookie (login admin) + curl perfil pessoal (leitura ok, escrita 403)

**Interfaces:**
- Consumes: `all, porColuna, um, inserir, atualizar` de `@/db`; tipos da Task 1; `exigirPapel/exigirSessao/ipAtual` de `@/lib/auth`; `registrarAuditoria`; `ResultadoAcao` de `@/actions/auth.js`
- Produces: `carregarEfetivo(busca) → { pessoas, setores }`, `gradeSemana(semanaISO) → { dias: [{ dia, turnos: [{ setor, itens: [{ escalaId, pessoa, turno, observacao }] }] }] }`, `salvarEfetivo(fd)`, `statusEfetivo(id, ativo)`, `salvarSetor(fd)`, `statusSetor(id, ativo)`, `adicionarEscala(fd)`, `removerEscala(id)`; endpoints GET/POST com `{ ok, dados/erro }`

- [ ] **Step 1: `src/server/efetivo.ts`**

```ts
import { all, porColuna } from "@/db";
import type { Efetivo, Escala, Militar, Setor } from "@/db/schema";
import { ensureSetores } from "@/lib/seed";
import { exigirSessao } from "@/lib/auth";

export async function carregarEfetivo(busca = "") {
  await exigirSessao();
  await ensureSetores();
  const [pessoas, setores] = await Promise.all([all<Efetivo>("efetivo"), all<Setor>("setores")]);
  const termo = busca.trim().toLowerCase();
  const filtradas = termo
    ? pessoas.filter((p) => [p.nome, p.postoGraduacao, p.funcao].filter(Boolean).some((c) => c!.toLowerCase().includes(termo)))
    : pessoas;
  return { pessoas: filtradas, setores };
}

export async function gradeSemana(semanaISO: string) {
  await exigirSessao();
  await ensureSetores();
  const [escalas, setores, pessoas] = await Promise.all([
    porColuna<Escala>("escalas", "semana", semanaISO),
    all<Setor>("setores"),
    all<Efetivo>("efetivo"),
  ]);
  const DIAS = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
  const dias = DIAS.map((rotulo, dia) => ({
    dia, rotulo,
    setores: setores.filter((s) => s.ativo).map((setor) => ({
      setor,
      itens: escalas
        .filter((e) => e.dia === dia && e.setorId === setor.id)
        .map((e) => ({ ...e, pessoa: pessoas.find((p) => p.id === e.efetivoId) ?? null })),
    })),
  }));
  return { dias, setores: setores.filter((s) => s.ativo), pessoas: pessoas.filter((p) => p.ativo) };
}
```

- [ ] **Step 2: `src/actions/efetivo.ts`** — `salvarEfetivo(formData)` (exige admin; se `militarId` válido, busca o militar via `um<Militar>` e copia nome/posto; `inserir` ou `atualizar` por `id`; auditoria), `statusEfetivo(id, ativo)`, `salvarSetor(formData)` (nome obrigatório; update por id ou insert; auditoria), `statusSetor(id, ativo)`, `adicionarEscala(formData)` (valida semana/dia/turno/setor/pessoa; `inserir`; captura erro de unique → `{ ok: false, erro: "Plantão já existe." }`), `removerEscala(id)` (delete? SDK tem `.delete()`? **Não há helper delete em `src/db/insforge.ts` — adicionar `remover(table, coluna, valor)` com `.delete().eq().select()` e erro se 0 linhas**). Todas com `await exigirPapel("admin")` primeiro.

- [ ] **Step 3: endpoints** — `GET /api/efetivo?busca=` → `carregarEfetivo`; `POST /api/efetivo` (form: criar/editar; JSON `{ id, ativo }` ?acao=status); `GET/POST /api/setores`; `GET /api/escalas?semana=`; `POST /api/escalas` (form adicionar; JSON `{ id }` ?acao=remover). Padrão de envelope dos endpoints Fase 1/2 (401 sem sessão, 403 sem admin no POST, 503 sem DB).

- [ ] **Step 4: Verificar com curl**

Run: login admin → cookie; `curl -b jar /api/efetivo`, `/api/setores`, `/api/escalas?semana=2026-09-21`; POST criar pessoa avulsa; login pessoal → POST deve dar 403.
Expected: 200s com dados; 6 setores seedados; 403 p/ pessoal no POST.

### Task 3: Views + páginas + sidebar

**Files:**
- Create: `src/components/EfetivoView.vue`, `src/components/FormularioEfetivo.vue`, `src/components/EscalaView.vue`, `src/components/FormularioEscala.vue`
- Modify: `src/pages/efetivo/index.astro`, `src/pages/escala/index.astro` (shells novos), `src/components/Sidebar.vue` (grupo "Efetivo" com 2 itens, todos os papéis)
- Test: build + typecheck + sweep + fluxo completo no navegador via curl (criar, vincular, escalar, imprimir endpoint? impressão é `window.print` no cliente)

**Interfaces:**
- Consumes: endpoints da Task 2; kit (`Badge/Card/Vazio/Aviso/CabecalhoPagina/Icone/Campo`); `buscarMilitares`? Não há endpoint — vínculo usa `GET /api/militares?busca=` (Task 1 Fase 1) com filtro local no form.
- Produces: nada (ilhas folha)

- [ ] **Step 1: `FormularioEfetivo.vue`** — campos nome, posto, função, telefone, busca-vínculo (fetch `/api/militares?busca=` + select preenche nome/posto e `militarId` hidden), ativo; POST `/api/efetivo`; props `inicial?` p/ edição; erro/sucesso como `FormularioMilitar.vue`.
- [ ] **Step 2: `EfetivoView.vue`** — busca GET, tabela (nome, posto, função, origem vínculo/avulso via `militarId`, situação), botões admin (Novo, Editar via form inline, Ativar/Desativar via POST JSON), skeleton `Carregando efetivo…`.
- [ ] **Step 3: `EscalaView.vue` + `FormularioEscala.vue`** — seletor de semana (anterior/próxima via query `?semana=` + ClientRouter), grade Seg–Dom × setores ativos, `FormularioEscala` (dia, turno select fixo, setor, pessoa do efetivo ativo, obs) POST `/api/escalas`, remover por item (POST JSON), bloco `area-impressao` + botão Imprimir via função `imprimir()` no script (nunca `window` no template — ver defeito #9 passado).
- [ ] **Step 4: shells + sidebar** — `src/pages/efetivo/index.astro` e `src/pages/escala/index.astro` (só `dadosLayout` + ilha; guardas: leitura qualquer papel logado); Sidebar: `{ href: "/efetivo", rotulo: "Efetivo", icone: "usuario", papeis: todos, grupo: "Efetivo" }`, `{ href: "/escala", ... }`.
- [ ] **Step 5: Build + typecheck + fluxo**

Run: `npm run build`, `npm run typecheck`
Expected: Complete!, 0 errors
Run: curl login admin → criar pessoa → vincular militar id 1 → GET /api/efetivo (contém) → criar escala semana corrente → GET /api/escalas?semana= (contém) → remover.
Expected: 200 em tudo; item some após remover.

## Self-Review

1. Spec coverage: migration+tipos+seed (Task 1), consultas+actions+endpoints (Task 2), views+páginas+sidebar (Task 3); impressão, RBAC leitura/escrita e auditoria cobertos; `parecer`-style form SSR não se aplica (forms são ilhas, padrão vigente).
2. Placeholder scan: sem TBD/TODO; SQL, código e comandos exatos; `remover()` definido na Task 2 antes do uso.
3. Type consistency: `Setor/Efetivo/Escala` idênticos nas 3 tasks; envelope `{ ok, dados/erro }`; `ResultadoAcao`; `dia 0–6`, `semana` ISO, turnos literais iguais no SQL, actions e views.
