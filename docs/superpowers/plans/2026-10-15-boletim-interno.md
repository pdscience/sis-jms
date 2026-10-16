# Boletim Interno — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Criar o Boletim Interno oficial da Junta a partir da escala semanal, com seções fixas, numeração, rascunho/publicado e saída em tela e PDF.

**Architecture:** Uma tabela nova (`boletins`) guarda cabeçalho, textos II/III/IV e um `escala_snapshot` (JSONB) gravado no ato de publicar. Rascunho lê a Seção I ao vivo de `escalas`; publicado lê o snapshot. Segue o padrão vigente: consultas em `src/server`, actions em `src/actions`, montagem em `src/lib`, endpoints JSON em `src/pages/api`, shells Astro + ilhas Vue.

**Tech Stack:** Astro 7, Vue 3.5 (`client:load`), @insforge/sdk server-only via `src/db/insforge.ts` (`all, porColuna, um, inserir, atualizar, remover, contar`), pdf-lib, Tailwind 4.

**Spec:** `docs/superpowers/specs/2026-10-15-boletim-interno-design.md`

## Global Constraints

- `semana` = data `YYYY-MM-DD` de uma **segunda-feira**; Seção I cobre segunda a domingo.
- `status` ∈ `rascunho | publicado`. Rascunho editável por qualquer sessão válida; publicar/excluir exige `exigirPapel("admin")`.
- Publicado é somente leitura e a Seção I vem do `escala_snapshot`; rascunho lê `escalas` ao vivo.
- Numeração: `numero = max(numero do ano)+1`; `ano` = ano da segunda-feira da semana; unique `(ano, numero)`.
- Auditoria em toda mutação: `CRIAR_BOLETIM`, `EDITAR_BOLETIM`, `PUBLICAR_BOLETIM`, `EXCLUIR_BOLETIM`, `EMITIR_PDF_BOLETIM`.
- Envelope de resposta `{ ok, dados? , erro?, sucesso?, id? }`; `ResultadoAcao` de `src/actions/auth.js`.
- **Não há test runner no repositório.** A verificação de cada task é `npm run typecheck`, `npm run lint`, `npm run build` (0 erros) e, quando aplicável, fluxo `curl` autenticado.

---

## File Structure

- Create: `migrations/<versão>_boletim-interno.sql` — tabela `boletins`.
- Modify: `src/db/schema.ts` — tipo `Boletim`.
- Modify: `src/lib/dominio.ts` — `STATUS_BOLETIM_LABEL`, `SECOES_BOLETIM`.
- Modify: `src/components/ui.ts` — `tomStatusBoletim`, `rotuloStatusBoletim`.
- Create: `src/lib/boletim.ts` — montagem da escala/seções para tela e PDF.
- Create: `src/server/boletim.ts` — `carregarBoletins`, `detalheBoletim`, `escalaEfetiva`.
- Create: `src/actions/boletim.ts` — `criarBoletim`, `salvarBoletim`, `publicarBoletim`, `excluirBoletim`.
- Modify: `src/lib/pdf.ts` — `gerarPdfBoletim`.
- Create: `src/pages/api/boletins/index.ts`, `src/pages/api/boletins/[id].ts`, `src/pages/api/boletins/[id]/pdf.ts`.
- Create: `src/components/BoletinsView.vue`, `FormularioBoletim.vue`, `BoletimDetalheView.vue`.
- Create: `src/pages/boletim/index.astro`, `src/pages/boletim/novo.astro`, `src/pages/boletim/[id].astro`.
- Modify: `src/components/Sidebar.vue` — item "Boletim interno".
- Modify: `src/components/EscalaView.vue` — atalho "Gerar boletim da semana".

---

### Task 1: Migration, tipo e rótulos

**Files:**
- Create: `migrations/<versão>_boletim-interno.sql` (via `npx -y @insforge/cli db migrations new boletim-interno`)
- Modify: `src/db/schema.ts`
- Modify: `src/lib/dominio.ts:159`
- Modify: `src/components/ui.ts:31`

**Interfaces:**
- Consumes: nada (primeira task).
- Produces: tabela `boletins`; tipo `Boletim` (camelCase; timestamps `string`; `escalaSnapshot: unknown | null`); `STATUS_BOLETIM_LABEL`; `SECOES_BOLETIM`; helpers `tomStatusBoletim`/`rotuloStatusBoletim`.

- [ ] **Step 1: Criar e escrever a migration**

Run: `npx -y @insforge/cli db migrations new boletim-interno`
Abrir o arquivo gerado e escrever (sem BEGIN/COMMIT):

```sql
CREATE TABLE boletins (
  id SERIAL PRIMARY KEY,
  numero INTEGER NOT NULL,
  ano INTEGER NOT NULL,
  semana DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'rascunho' CHECK (status IN ('rascunho', 'publicado')),
  secao2 TEXT,
  secao3 TEXT,
  secao4 TEXT,
  escala_snapshot JSONB,
  criado_por INTEGER,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  publicado_por INTEGER,
  publicado_em TIMESTAMPTZ
);
CREATE UNIQUE INDEX boletins_ano_numero_uidx ON boletins (ano, numero);
```

- [ ] **Step 2: Aplicar a migration**

Run: `npx -y @insforge/cli db migrations up --all`
Expected: `✓ Applied 1 migration file(s).`
Run: `npx -y @insforge/cli db tables`
Expected: `boletins` listada.

- [ ] **Step 3: Tipo `Boletim` em `src/db/schema.ts`**

Acrescentar ao final do arquivo (após `Escala`):

```ts
export type Boletim = {
  id: number; numero: number; ano: number; semana: string; status: string;
  secao2: string | null; secao3: string | null; secao4: string | null;
  escalaSnapshot: unknown | null;
  criadoPor: number | null; criadoEm: string; atualizadoEm: string;
  publicadoPor: number | null; publicadoEm: string | null;
};
```

- [ ] **Step 4: Rótulos em `src/lib/dominio.ts`**

Acrescentar após `STATUS_CONVOCACAO_LABEL` (linha 107):

```ts
export const STATUS_BOLETIM_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  publicado: "Publicado",
};

export const SECOES_BOLETIM = [
  { campo: "secao2", titulo: "II – ORDENS DE SERVIÇO" },
  { campo: "secao3", titulo: "III – ASSUNTOS ADMINISTRATIVOS" },
  { campo: "secao4", titulo: "IV – COMUNICADOS" },
] as const;
```

- [ ] **Step 5: Helpers de status em `src/components/ui.ts`**

Acrescentar após `tomStatusAta` (linha 31) o import de `STATUS_BOLETIM_LABEL` (adicionar à lista de imports existente do topo) e as funções:

```ts
export const tomStatusBoletim = (status: string): Tom =>
  ({ rascunho: "neutro", publicado: "verde" })[status] as Tom;

export function rotuloStatusBoletim(status: string) {
  return STATUS_BOLETIM_LABEL[status] ?? status;
}
```

No `import { ... } from "@/lib/dominio"` do topo, incluir `STATUS_BOLETIM_LABEL`.

- [ ] **Step 6: Verificar**

Run: `npm run typecheck` e `npm run lint`
Expected: 0 erros / 0 problemas.
Commit: `git add migrations src/db/schema.ts src/lib/dominio.ts src/components/ui.ts && git commit -m "feat(boletim): tabela, tipo e rótulos do boletim interno"`

---

### Task 2: Montagem (lib), consultas (server) e actions

**Files:**
- Create: `src/lib/boletim.ts`
- Create: `src/server/boletim.ts`
- Create: `src/actions/boletim.ts`

**Interfaces:**
- Consumes: `all, porColuna, um, inserir, atualizar, remover` de `@/db`; `Boletim` de `@/db/schema`; `exigirSessao/exigirPapel/ipAtual` de `@/lib/auth`; `registrarAuditoria`; `gradeSemana` de `@/server/efetivo`; `ResultadoAcao` de `./auth.js`.
- Produces:
  - `montarEscalaBoletim(semana: string, grade: GradeSemana): EscalaBoletim`
  - `secoesTextoBoletim(b: { secao2; secao3; secao4 }): SecaoBoletim[]`
  - tipos `GradeSemana`, `EscalaBoletim`, `SecaoBoletim`, `DiaEscalaBoletim`, `SetorEscalaBoletim`, `ItemEscalaBoletim`
  - `carregarBoletins(filtros): Promise<Boletim[]>`
  - `detalheBoletim(id): Promise<{ boletim: Boletim; escala: EscalaBoletim } | null>`
  - `escalaEfetiva(boletim): Promise<EscalaBoletim>`
  - `criarBoletim(fd)`, `salvarBoletim(fd)`, `publicarBoletim(id)`, `excluirBoletim(id)` → `ResultadoAcao`

- [ ] **Step 1: `src/lib/boletim.ts`**

```ts
export type ItemGrade = {
  turno: string; observacao: string | null;
  pessoa: { nome: string; postoGraduacao: string | null } | null;
};
export type SetorGrade = { setor: { id: number; nome: string }; itens: ItemGrade[] };
export type DiaGrade = { dia: number; rotulo: string; setores: SetorGrade[] };
export type GradeSemana = { dias: DiaGrade[] };

export type ItemEscalaBoletim = { turno: string; pessoaNome: string; observacao: string | null };
export type SetorEscalaBoletim = { setor: string; itens: ItemEscalaBoletim[] };
export type DiaEscalaBoletim = { dia: number; rotulo: string; setores: SetorEscalaBoletim[] };
export type EscalaBoletim = { semana: string; geradoEm: string; dias: DiaEscalaBoletim[] };
export type SecaoBoletim = { titulo: string; paragrafos: string[] };

const ORDEM_TURNOS = ["manhã", "tarde", "integral", "plantão"];

/** Converte a grade ao vivo da semana no formato congelável do boletim. */
export function montarEscalaBoletim(semana: string, grade: GradeSemana): EscalaBoletim {
  const dias: DiaEscalaBoletim[] = grade.dias.map((d) => ({
    dia: d.dia,
    rotulo: d.rotulo,
    setores: d.setores
      .filter((s) => s.itens.length > 0)
      .map((s) => ({
        setor: s.setor.nome,
        itens: [...s.itens]
          .sort((a, b) => ORDEM_TURNOS.indexOf(a.turno) - ORDEM_TURNOS.indexOf(b.turno))
          .map((it) => ({
            turno: it.turno,
            pessoaNome: it.pessoa
              ? `${it.pessoa.postoGraduacao ? `${it.pessoa.postoGraduacao} ` : ""}${it.pessoa.nome}`
              : "—",
            observacao: it.observacao,
          })),
      })),
  }));
  return { semana, geradoEm: new Date().toISOString(), dias };
}

function emParagrafos(texto: string | null): string[] {
  const limpo = (texto ?? "").trim();
  if (!limpo) return ["Sem registro."];
  return limpo.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
}

/** Seções II–IV como parágrafos para tela e PDF. */
export function secoesTextoBoletim(b: {
  secao2: string | null; secao3: string | null; secao4: string | null;
}): SecaoBoletim[] {
  return [
    { titulo: "II – ORDENS DE SERVIÇO", paragrafos: emParagrafos(b.secao2) },
    { titulo: "III – ASSUNTOS ADMINISTRATIVOS", paragrafos: emParagrafos(b.secao3) },
    { titulo: "IV – COMUNICADOS", paragrafos: emParagrafos(b.secao4) },
  ];
}
```

- [ ] **Step 2: `src/server/boletim.ts`**

```ts
import { all, um } from "@/db";
import type { Boletim } from "@/db/schema";
import { exigirSessao } from "@/lib/auth";
import { gradeSemana } from "@/server/efetivo";
import { montarEscalaBoletim, type EscalaBoletim } from "@/lib/boletim";

const iso = (v: unknown) => String(v).slice(0, 10);

export async function carregarBoletins(
  filtros: { ano?: string; status?: string; busca?: string } = {},
): Promise<Boletim[]> {
  await exigirSessao();
  const boletins = await all<Boletim>("boletins", { order: { coluna: "criadoEm", asc: false } });
  const termo = (filtros.busca ?? "").trim().toLowerCase();
  return boletins.filter((b) => {
    if (filtros.ano && filtros.ano !== "todos" && String(b.ano) !== filtros.ano) return false;
    if (filtros.status && filtros.status !== "todos" && b.status !== filtros.status) return false;
    if (termo && !`${b.numero}/${b.ano} ${iso(b.semana)}`.toLowerCase().includes(termo)) return false;
    return true;
  });
}

export async function escalaEfetiva(boletim: Boletim): Promise<EscalaBoletim> {
  if (boletim.status === "publicado" && boletim.escalaSnapshot) {
    return boletim.escalaSnapshot as EscalaBoletim;
  }
  const semana = iso(boletim.semana);
  const grade = await gradeSemana(semana);
  return montarEscalaBoletim(semana, grade);
}

export async function detalheBoletim(
  id: number,
): Promise<{ boletim: Boletim; escala: EscalaBoletim } | null> {
  await exigirSessao();
  const boletim = await um<Boletim>("boletins", "id", id);
  if (!boletim) return null;
  return { boletim, escala: await escalaEfetiva(boletim) };
}
```

- [ ] **Step 3: `src/actions/boletim.ts`**

```ts
import { atualizar, inserir, porColuna, remover, um } from "@/db";
import type { Boletim } from "@/db/schema";
import { exigirPapel, exigirSessao, ipAtual } from "@/lib/auth";
import { registrarAuditoria } from "@/lib/audit";
import { gradeSemana } from "@/server/efetivo";
import { montarEscalaBoletim } from "@/lib/boletim";
import type { ResultadoAcao } from "./auth.js";

function texto(fd: FormData, campo: string): string | null {
  const v = String(fd.get(campo) ?? "").trim();
  return v.length ? v : null;
}
function numero(fd: FormData, campo: string): number | null {
  const v = String(fd.get(campo) ?? "").trim();
  if (!v) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function segundaValida(semana: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(semana)) return false;
  const [ano, mes, dia] = semana.split("-").map(Number);
  const d = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0));
  return d.getUTCFullYear() === ano && d.getUTCMonth() === mes - 1
    && d.getUTCDate() === dia && d.getUTCDay() === 1;
}
const rotulo = (numero: number, ano: number) => `BI nº ${String(numero).padStart(3, "0")}/${ano}`;

export async function criarBoletim(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  const semana = texto(formData, "semana");
  if (!semana || !segundaValida(semana)) {
    return { ok: false, erro: "Informe uma segunda-feira válida (YYYY-MM-DD)." };
  }
  const ano = Number(semana.slice(0, 4));

  for (let tentativa = 0; tentativa < 2; tentativa++) {
    const doAno = await porColuna<Boletim>("boletins", "ano", ano);
    const proximo = doAno.reduce((m, b) => Math.max(m, b.numero), 0) + 1;
    try {
      const novo = await inserir<Boletim>("boletins", {
        numero: proximo, ano, semana, status: "rascunho",
        secao2: null, secao3: null, secao4: null, criadoPor: operador.id,
      });
      await registrarAuditoria(operador, {
        acao: "CRIAR_BOLETIM", entidade: "boletim", entidadeId: novo.id,
        resumo: `${rotulo(novo.numero, novo.ano)} criado (semana de ${semana})`,
        detalhes: { semana }, ip: await ipAtual(),
      });
      return { ok: true, sucesso: "Boletim criado como rascunho.", id: novo.id };
    } catch (e) {
      const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
      const conflito = msg.includes("unique") || msg.includes("duplicate")
        || msg.includes("23505") || msg.includes("already exists");
      if (!conflito || tentativa === 1) throw e;
    }
  }
  return { ok: false, erro: "Não foi possível numerar o boletim. Tente novamente." };
}

export async function salvarBoletim(formData: FormData): Promise<ResultadoAcao> {
  const operador = await exigirSessao();
  const id = numero(formData, "id");
  if (!id) return { ok: false, erro: "Informe o boletim." };
  const boletim = await um<Boletim>("boletins", "id", id);
  if (!boletim) return { ok: false, erro: "Boletim não encontrado." };
  if (boletim.status === "publicado") return { ok: false, erro: "Boletim publicado é somente leitura." };

  const dados = {
    secao2: texto(formData, "secao2"),
    secao3: texto(formData, "secao3"),
    secao4: texto(formData, "secao4"),
    atualizadoEm: new Date(),
  };
  await atualizar<Boletim>("boletins", dados, "id", id);
  await registrarAuditoria(operador, {
    acao: "EDITAR_BOLETIM", entidade: "boletim", entidadeId: id,
    resumo: `${rotulo(boletim.numero, boletim.ano)} editado`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Boletim salvo." };
}

export async function publicarBoletim(id: number): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const boletim = await um<Boletim>("boletins", "id", id);
  if (!boletim) return { ok: false, erro: "Boletim não encontrado." };
  if (boletim.status === "publicado") return { ok: false, erro: "Boletim já publicado." };

  const semana = String(boletim.semana).slice(0, 10);
  const snapshot = montarEscalaBoletim(semana, await gradeSemana(semana));
  const agora = new Date();
  await atualizar<Boletim>("boletins", {
    status: "publicado", escalaSnapshot: snapshot,
    publicadoPor: operador.id, publicadoEm: agora, atualizadoEm: agora,
  }, "id", id);
  await registrarAuditoria(operador, {
    acao: "PUBLICAR_BOLETIM", entidade: "boletim", entidadeId: id,
    resumo: `${rotulo(boletim.numero, boletim.ano)} publicado`,
    detalhes: { semana }, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Boletim publicado." };
}

export async function excluirBoletim(id: number): Promise<ResultadoAcao> {
  const operador = await exigirPapel("admin");
  const boletim = await um<Boletim>("boletins", "id", id);
  if (!boletim) return { ok: false, erro: "Boletim não encontrado." };
  if (boletim.status === "publicado") return { ok: false, erro: "Boletim publicado não pode ser excluído." };
  try {
    await remover("boletins", "id", id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg.includes("nenhum registro")) return { ok: false, erro: "Boletim não encontrado." };
    throw e;
  }
  await registrarAuditoria(operador, {
    acao: "EXCLUIR_BOLETIM", entidade: "boletim", entidadeId: id,
    resumo: `${rotulo(boletim.numero, boletim.ano)} excluído`, ip: await ipAtual(),
  });
  return { ok: true, sucesso: "Rascunho excluído." };
}
```

- [ ] **Step 4: Verificar**

Run: `npm run typecheck` e `npm run lint`
Expected: 0 erros / 0 problemas.
Commit: `git add src/lib/boletim.ts src/server/boletim.ts src/actions/boletim.ts && git commit -m "feat(boletim): montagem, consultas e actions do boletim"`

---

### Task 3: Geração de PDF (`gerarPdfBoletim`)

**Files:**
- Modify: `src/lib/pdf.ts` (adiciona função ao final)

**Interfaces:**
- Consumes: `montarEscalaBoletim`/`secoesTextoBoletim` (via tipos `EscalaBoletim`, `SecaoBoletim` de `@/lib/boletim`); `formatBR`, `formatDataHora`, `addDias` de `@/lib/datas`.
- Produces: `gerarPdfBoletim(dados: BoletimPdfDados): Promise<Uint8Array>` e o tipo `BoletimPdfDados`.

- [ ] **Step 1: Ajustar imports do topo de `src/lib/pdf.ts`**

Trocar a linha `import { formatBR, formatDataHora, mesPorExtenso } from "@/lib/datas";` por:

```ts
import { addDias, formatBR, formatDataHora, mesPorExtenso } from "@/lib/datas";
import type { EscalaBoletim, SecaoBoletim } from "@/lib/boletim";
```

- [ ] **Step 2: Acrescentar `gerarPdfBoletim` ao final de `src/lib/pdf.ts`**

```ts
export type BoletimPdfDados = {
  numero: number; ano: number; semana: string; status: string; publicadoEm: string | null;
  om: string; escala: EscalaBoletim; secoes: SecaoBoletim[];
};

/** Boletim Interno em A4: cabeçalho, Seção I (escala) em tabela e seções II–IV. */
export async function gerarPdfBoletim(dados: BoletimPdfDados): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const fonte = await pdf.embedFont(StandardFonts.Helvetica);
  const fonteNegrito = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fonteSerifada = await pdf.embedFont(StandardFonts.TimesRoman);
  const cor = rgb(0.09, 0.14, 0.1);
  const corSuave = rgb(0.36, 0.42, 0.36);
  const numeroFmt = `${String(dados.numero).padStart(3, "0")}/${dados.ano}`;

  pdf.setTitle(`BI nº ${numeroFmt} — Boletim Interno`);
  pdf.setAuthor("Junta de Inspeção de Saúde");
  pdf.setSubject("Boletim Interno");
  pdf.setCreator("SIS-JIS");

  let pagina = pdf.addPage([LARGURA_A4, ALTURA_A4]);
  let y = ALTURA_A4 - MARGEM;

  const quebrar = (texto: string, f: typeof fonte, tamanho: number, largura = LARGURA_TEXTO): string[] => {
    const linhas: string[] = [];
    let atual = "";
    for (const palavra of texto.split(/\s+/).filter(Boolean)) {
      const teste = atual ? `${atual} ${palavra}` : palavra;
      if (f.widthOfTextAtSize(teste, tamanho) <= largura) atual = teste;
      else {
        if (atual) linhas.push(atual);
        atual = palavra;
      }
    }
    if (atual) linhas.push(atual);
    return linhas.length ? linhas : [""];
  };

  const novaPaginaSeNecessario = (altura: number) => {
    if (y - altura < MARGEM + 30) {
      pagina = pdf.addPage([LARGURA_A4, ALTURA_A4]);
      y = ALTURA_A4 - MARGEM;
    }
  };

  const escrever = (
    texto: string, f: typeof fonte, tamanho: number,
    opcoes: { entrelinha?: number; corTexto?: typeof cor; recuo?: number } = {},
  ) => {
    const { entrelinha = tamanho * 1.45, corTexto = cor, recuo = 0 } = opcoes;
    for (const linha of quebrar(texto, f, tamanho, LARGURA_TEXTO - recuo)) {
      novaPaginaSeNecessario(entrelinha);
      pagina.drawText(linha, { x: MARGEM + recuo, y: y - tamanho, size: tamanho, font: f, color: corTexto });
      y -= entrelinha;
    }
  };

  const linhaHorizontal = (espessura = 0.7, deslocamento = 6) => {
    novaPaginaSeNecessario(deslocamento + 4);
    pagina.drawLine({
      start: { x: MARGEM, y: y - deslocamento },
      end: { x: LARGURA_A4 - MARGEM, y: y - deslocamento },
      thickness: espessura, color: rgb(0.55, 0.6, 0.55),
    });
    y -= deslocamento + 10;
  };

  const colunas = [
    { titulo: "Setor", largura: 110 },
    { titulo: "Turno", largura: 62 },
    { titulo: "Pessoa", largura: 175 },
    { titulo: "Observação", largura: LARGURA_TEXTO - 347 },
  ];

  const desenharCabecalhoTabela = () => {
    const h = 15;
    novaPaginaSeNecessario(h + 6);
    pagina.drawRectangle({ x: MARGEM, y: y - h, width: LARGURA_TEXTO, height: h, color: rgb(0.93, 0.94, 0.92) });
    let x = MARGEM;
    for (const c of colunas) {
      pagina.drawText(c.titulo, { x: x + 3, y: y - h + 4, size: 8.5, font: fonteNegrito, color: cor });
      x += c.largura;
    }
    y -= h;
  };

  const desenharLinhaTabela = (valores: string[]) => {
    const celulas = valores.map((v, i) => quebrar(v, fonte, 9, colunas[i].largura - 6));
    const altura = Math.max(...celulas.map((c) => c.length), 1) * 11 + 4;
    novaPaginaSeNecessario(altura);
    let x = MARGEM;
    celulas.forEach((linhasTexto, i) => {
      linhasTexto.forEach((linha, j) => {
        pagina.drawText(linha, { x: x + 3, y: y - 11 - j * 11, size: 9, font: fonte, color: cor });
      });
      x += colunas[i].largura;
    });
    pagina.drawLine({
      start: { x: MARGEM, y: y - altura }, end: { x: LARGURA_A4 - MARGEM, y: y - altura },
      thickness: 0.4, color: rgb(0.8, 0.82, 0.8),
    });
    y -= altura;
  };

  /* Cabeçalho institucional */
  escrever("GOVERNO DE RONDÔNIA — POLÍCIA MILITAR", fonteNegrito, 9, { entrelinha: 12 });
  escrever(dados.om.toUpperCase(), fonte, 9, { entrelinha: 12, corTexto: corSuave });
  escrever("JUNTA DE INSPEÇÃO DE SAÚDE — JIS", fonte, 9, { entrelinha: 14, corTexto: corSuave });
  linhaHorizontal(1.1);
  escrever("BOLETIM INTERNO", fonteNegrito, 16, { entrelinha: 22 });
  escrever(`BI nº ${numeroFmt}`, fonteNegrito, 11, { entrelinha: 16, corTexto: corSuave });
  escrever(
    `Semana de ${formatBR(dados.semana)} a ${formatBR(addDias(dados.semana, 6))} · Situação: ${dados.status.toUpperCase()}`,
    fonte, 10,
  );
  if (dados.publicadoEm) escrever(`Publicado em ${formatDataHora(dados.publicadoEm)}`, fonte, 9, { entrelinha: 13, corTexto: corSuave });
  y -= 4;
  linhaHorizontal(0.5);

  /* Seção I — Escala de Serviço */
  novaPaginaSeNecessario(40);
  escrever("I – ESCALA DE SERVIÇO", fonteNegrito, 11, { entrelinha: 16 });
  for (const dia of dados.escala.dias) {
    if (dia.setores.length === 0) continue;
    novaPaginaSeNecessario(40);
    escrever(`${dia.rotulo} — ${formatBR(addDias(dados.escala.semana, dia.dia))}`, fonteNegrito, 10, { entrelinha: 15 });
    desenharCabecalhoTabela();
    for (const setor of dia.setores) {
      for (const item of setor.itens) {
        desenharLinhaTabela([setor.setor, item.turno, item.pessoaNome, item.observacao ?? "—"]);
      }
    }
    y -= 6;
  }

  /* Seções II–IV */
  for (const secao of dados.secoes) {
    novaPaginaSeNecessario(50);
    escrever(secao.titulo, fonteNegrito, 11, { entrelinha: 16 });
    for (const paragrafo of secao.paragrafos) {
      escrever(paragrafo, fonteSerifada, 10.5, { entrelinha: 15.5, recuo: 8 });
    }
    y -= 6;
  }

  /* Rodapé numerado */
  const totalPaginas = pdf.getPageCount();
  pdf.getPages().forEach((p, indice) => {
    p.drawText(
      `SIS-JIS · BI nº ${numeroFmt} · gerado eletronicamente em ${formatDataHora(new Date())} · Página ${indice + 1} de ${totalPaginas}`,
      { x: MARGEM, y: 30, size: 7.5, font: fonte, color: corSuave },
    );
  });

  return pdf.save();
}
```

- [ ] **Step 3: Verificar**

Run: `npm run typecheck` e `npm run lint`
Expected: 0 erros / 0 problemas.
Commit: `git add src/lib/pdf.ts && git commit -m "feat(boletim): geracao de PDF A4 do boletim interno"`

---

### Task 4: Endpoints da API

**Files:**
- Create: `src/pages/api/boletins/index.ts`
- Create: `src/pages/api/boletins/[id].ts`
- Create: `src/pages/api/boletins/[id]/pdf.ts`

**Interfaces:**
- Consumes: `carregarBoletins`, `detalheBoletim` (@/server/boletim); `criarBoletim`, `salvarBoletim`, `publicarBoletim`, `excluirBoletim` (@/actions/boletim); `gerarPdfBoletim` (@/lib/pdf); `secoesTextoBoletim` (@/lib/boletim); `all` (@/db); `AuditoriaRow` (@/db/schema); `comSessaoAstro`/`getSessionUser`; `registrarAuditoria`; `ipAtual`; `isDbAvailable`.
- Produces: rotas `GET/POST /api/boletins`, `GET /api/boletins/[id]`, `GET /api/boletins/[id]/pdf`.

- [ ] **Step 1: `src/pages/api/boletins/index.ts`**

```ts
import type { APIRoute } from "astro";
import { carregarBoletins } from "../../../server/boletim.js";
import { criarBoletim, publicarBoletim, salvarBoletim, excluirBoletim } from "../../../actions/boletim.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";
import { isDbAvailable } from "../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    if (!(await getSessionUser(ctx))) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const ano = ctx.url.searchParams.get("ano") ?? "todos";
      const status = ctx.url.searchParams.get("status") ?? "todos";
      const busca = ctx.url.searchParams.get("busca") ?? "";
      const boletins = await carregarBoletins({ ano, status, busca });
      return Response.json({ ok: true, dados: { boletins } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao listar boletins." }, { status: 500 });
    }
  });

export const POST: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco de dados indisponível." }, { status: 503 });
    try {
      const acao = ctx.url.searchParams.get("acao");
      if (acao === "publicar" || acao === "excluir") {
        const body = await ctx.request.json().catch(() => null);
        const id = Number(body?.id);
        if (!Number.isFinite(id)) return Response.json({ ok: false, erro: "Informe um id válido." }, { status: 400 });
        const r = acao === "publicar" ? await publicarBoletim(id) : await excluirBoletim(id);
        return Response.json(r, { status: r.ok ? 200 : 400 });
      }
      const fd = await ctx.request.formData().catch(() => null);
      if (!fd) return Response.json({ ok: false, erro: "Formulário inválido." }, { status: 400 });
      const r = fd.get("id") ? await salvarBoletim(fd) : await criarBoletim(fd);
      return Response.json(r, { status: r.ok ? 200 : 400 });
    } catch (e) {
      if (e instanceof Error && e.name === "AcessoNegado") {
        return Response.json({ ok: false, erro: e.message }, { status: 403 });
      }
      return Response.json({ ok: false, erro: "Falha na operação." }, { status: 500 });
    }
  });
```

- [ ] **Step 2: `src/pages/api/boletins/[id].ts`**

```ts
import type { APIRoute } from "astro";
import { detalheBoletim } from "../../../server/boletim.js";
import { all, isDbAvailable } from "../../../db/index.js";
import type { AuditoriaRow } from "../../../db/schema.js";
import { comSessaoAstro, getSessionUser } from "../../../lib/auth-context.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ ok: false, erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ ok: false, erro: "Não autenticado." }, { status: 401 });
    try {
      const visao = await detalheBoletim(Number(ctx.params.id));
      if (!visao) return Response.json({ ok: false, erro: "Boletim não encontrado." }, { status: 404 });
      const todos = await all<AuditoriaRow>("auditoria", { order: { coluna: "criadoEm", asc: false } });
      const eventos = todos.filter((e) => e.entidade === "boletim" && e.entidadeId === String(visao.boletim.id));
      return Response.json({ ok: true, dados: { ...visao, eventos, papel: usuario.papel } });
    } catch {
      return Response.json({ ok: false, erro: "Falha ao carregar boletim." }, { status: 500 });
    }
  });
```

- [ ] **Step 3: `src/pages/api/boletins/[id]/pdf.ts`**

```ts
import type { APIRoute } from "astro";
import { detalheBoletim } from "../../../../server/boletim.js";
import { gerarPdfBoletim } from "../../../../lib/pdf.js";
import { secoesTextoBoletim } from "../../../../lib/boletim.js";
import { registrarAuditoria } from "../../../../lib/audit.js";
import { comSessaoAstro, getSessionUser } from "../../../../lib/auth-context.js";
import { ipAtual } from "../../../../lib/auth.js";
import { isDbAvailable } from "../../../../db/index.js";

export const GET: APIRoute = (ctx) =>
  comSessaoAstro(ctx, async () => {
    if (!isDbAvailable()) return Response.json({ erro: "Banco indisponível." }, { status: 503 });
    const usuario = await getSessionUser(ctx);
    if (!usuario) return Response.json({ erro: "Não autenticado." }, { status: 401 });

    const visao = await detalheBoletim(Number(ctx.params.id)).catch(() => null);
    if (!visao) return Response.json({ erro: "Boletim não encontrado." }, { status: 404 });

    const pdf = await gerarPdfBoletim({
      numero: visao.boletim.numero,
      ano: visao.boletim.ano,
      semana: String(visao.boletim.semana).slice(0, 10),
      status: visao.boletim.status,
      publicadoEm: visao.boletim.publicadoEm,
      om: usuario.om ?? "Polícia Militar de Rondônia",
      escala: visao.escala,
      secoes: secoesTextoBoletim(visao.boletim),
    });

    const h = ctx.request.headers;
    await registrarAuditoria(usuario, {
      acao: "EMITIR_PDF_BOLETIM", entidade: "boletim", entidadeId: visao.boletim.id,
      resumo: `PDF do BI nº ${visao.boletim.numero}/${visao.boletim.ano} gerado`,
      ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? (await ipAtual()),
    }).catch(() => undefined);

    const nome = `bi_${String(visao.boletim.numero).padStart(3, "0")}_${visao.boletim.ano}`;
    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${nome}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  });
```

- [ ] **Step 4: Verificar com curl**

Subir o app (`npm run dev`), logar e testar (substituir credenciais conhecidas do seed):
Run:
```bash
curl -s -c /tmp/jar -X POST -d 'login=admin&senha=admin' localhost:4321/api/auth/entrar
SEM=$(date -d "last monday" +%F)
curl -s -b /tmp/jar -X POST -F "semana=$SEM" localhost:4321/api/boletins
curl -s -b /tmp/jar "localhost:4321/api/boletins"
curl -s -b /tmp/jar "localhost:4321/api/boletins/1"
curl -s -o /tmp/bi.pdf -w "%{content_type}\n" -b /tmp/jar "localhost:4321/api/boletins/1/pdf"
```
Expected: POST retorna `{ok:true,id}`; GET lista com 1 item; detalhe retorna `boletim`+`escala`; PDF responde `application/pdf`.
Commit: `git add src/pages/api/boletins && git commit -m "feat(boletim): endpoints de API e PDF"`

---

### Task 5: Ilhas, páginas, Sidebar e atalho

**Files:**
- Create: `src/components/BoletinsView.vue`, `src/components/FormularioBoletim.vue`, `src/components/BoletimDetalheView.vue`
- Create: `src/pages/boletim/index.astro`, `src/pages/boletim/novo.astro`, `src/pages/boletim/[id].astro`
- Modify: `src/components/Sidebar.vue:19-25`
- Modify: `src/components/EscalaView.vue:118-123`

**Interfaces:**
- Consumes: endpoints da Task 4; kit (`Badge/Card/Vazio/Aviso/CabecalhoPagina/Icone/Campo`); helpers de `ui.ts`/`dominio.ts`/`datas.ts`.
- Produces: nada (ilhas/páginas folha).

- [ ] **Step 1: `src/components/BoletinsView.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Vazio from "./Vazio.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { formatBR } from "../lib/datas.js";
import { rotuloStatusBoletim, tomStatusBoletim, classeBotaoPrimario, classeInput, classeTd, classeTh } from "./ui.js";

const props = defineProps<{ ano?: string; status?: string; busca?: string }>();
const anoAtual = computed(() => props.ano ?? "todos");
const statusAtual = computed(() => props.status ?? "todos");
const buscaAtual = computed(() => props.busca ?? "");

const carregando = ref(true);
const erro = ref("");
const boletins = ref<any[]>([]);

onMounted(async () => {
  try {
    const q = new URLSearchParams({ ano: anoAtual.value, status: statusAtual.value, busca: buscaAtual.value });
    const r = await fetch(`/api/boletins?${q}`);
    const j = await r.json();
    if (j.ok) boletins.value = j.dados.boletins;
    else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
});

const numeroFmt = (b: any) => `BI nº ${String(b.numero).padStart(3, "0")}/${b.ano}`;
const semanaISO = (b: any) => String(b.semana).slice(0, 10);
</script>

<template>
  <CabecalhoPagina
    titulo="Boletim interno"
    descricao="Documento oficial que publica a escala de serviço da semana e os assuntos administrativos da Junta."
    :migalhas="[{ rotulo: 'Início', href: '/painel' }, { rotulo: 'Boletim interno' }]"
  >
    <template #acoes>
      <a :class="classeBotaoPrimario" href="/boletim/novo"><Icone nome="mais" className="h-4 w-4" /> Novo boletim</a>
    </template>
  </CabecalhoPagina>

  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando boletins…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/login" class="font-semibold underline">Fazer login</a></Aviso>
  <Card v-else :corpo="false">
    <form method="get" action="/boletim" class="flex flex-wrap items-end gap-3 border-b border-campo-100 p-4">
      <div class="min-w-[220px] flex-1">
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Busca</span>
        <div class="relative">
          <span class="pointer-events-none absolute left-3 top-2.5 text-campo-400"><Icone nome="busca" /></span>
          <input name="busca" :value="buscaAtual" :class="`${classeInput} pl-9`" placeholder="Número, ano ou semana" />
        </div>
      </div>
      <div>
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Ano</span>
        <input name="ano" :value="anoAtual === 'todos' ? '' : anoAtual" :class="classeInput" placeholder="todos" inputmode="numeric" />
      </div>
      <div>
        <span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">Situação</span>
        <select name="status" :class="classeInput">
          <option value="todos" :selected="statusAtual === 'todos'">Todas</option>
          <option value="rascunho" :selected="statusAtual === 'rascunho'">Rascunho</option>
          <option value="publicado" :selected="statusAtual === 'publicado'">Publicado</option>
        </select>
      </div>
      <button type="submit" :class="classeBotaoPrimario">Filtrar</button>
    </form>

    <div v-if="boletins.length === 0" class="p-5"><Vazio titulo="Nenhum boletim localizado" descricao="Crie um boletim a partir da escala de uma semana." /></div>
    <div v-else class="rolagem-fina overflow-x-auto">
      <table class="min-w-full divide-y divide-campo-100 text-sm">
        <thead class="bg-campo-50/70"><tr><th :class="classeTh">Boletim</th><th :class="classeTh">Semana coberta</th><th :class="classeTh">Situação</th><th :class="classeTh">Criado em</th><th :class="classeTh">Documento</th></tr></thead>
        <tbody class="divide-y divide-campo-100">
          <tr v-for="b in boletins" :key="b.id" class="hover:bg-campo-50/60">
            <td :class="classeTd"><a :href="`/boletim/${b.id}`" class="font-mono text-xs font-semibold text-campo-800 hover:underline">{{ numeroFmt(b) }}</a></td>
            <td :class="`${classeTd} text-xs`">início em {{ formatBR(semanaISO(b)) }}</td>
            <td :class="classeTd"><Badge :tom="tomStatusBoletim(b.status)">{{ rotuloStatusBoletim(b.status) }}</Badge></td>
            <td :class="`${classeTd} text-xs`">{{ formatBR(b.criadoEm) }}</td>
            <td :class="classeTd">
              <div class="flex gap-2">
                <a :href="`/boletim/${b.id}`" class="rounded-lg border border-campo-300 px-2.5 py-1 text-xs font-semibold text-campo-800 hover:bg-campo-50">Abrir</a>
                <a v-if="b.status === 'publicado'" :href="`/api/boletins/${b.id}/pdf`" target="_blank" rel="noreferrer" class="inline-flex items-center gap-1 rounded-lg border border-campo-300 px-2.5 py-1 text-xs font-semibold text-campo-800 hover:bg-campo-50"><Icone nome="download" className="h-3.5 w-3.5" /> PDF</a>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Card>
</template>
```

- [ ] **Step 2: `src/components/FormularioBoletim.vue`**

```vue
<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import Campo from "./Campo.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import { classeBotaoPrimario, classeBotaoSecundario, classeInput } from "./ui.js";

const props = defineProps<{ semana: string }>();
const semana = ref(props.semana);
const erro = ref("");
const pendente = ref(false);
const confirmado = ref(false);
const existentes = ref<{ id: number; numero: number; ano: number; semana: string }[]>([]);

onMounted(async () => {
  try {
    const r = await fetch("/api/boletins");
    const j = await r.json();
    if (j.ok) {
      existentes.value = j.dados.boletins.map((b: any) => ({
        id: b.id, numero: b.numero, ano: b.ano, semana: String(b.semana).slice(0, 10),
      }));
    }
  } catch { /* segue sem checagem */ }
});

const conflito = computed(() => existentes.value.find((b) => b.semana === semana.value) ?? null);

async function onSubmit() {
  erro.value = "";
  if (conflito.value && !confirmado.value) { confirmado.value = true; return; }
  pendente.value = true;
  try {
    const fd = new FormData();
    fd.set("semana", semana.value);
    const r = await fetch("/api/boletins", { method: "POST", body: fd });
    const j = await r.json();
    if (j.ok) window.location.href = `/boletim/${j.id}`;
    else { erro.value = j.erro ?? "Falha ao criar boletim."; confirmado.value = false; }
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    pendente.value = false;
  }
}
</script>

<template>
  <CabecalhoPagina
    titulo="Novo boletim interno"
    descricao="Escolha a segunda-feira da semana. A Seção I (Escala de Serviço) será montada a partir da escala daquela semana."
    :migalhas="[{ rotulo: 'Boletim interno', href: '/boletim' }, { rotulo: 'Novo' }]"
  />

  <div class="max-w-xl rounded-xl border border-campo-200 bg-white p-6 shadow-sm">
    <form class="space-y-4" @submit.prevent="onSubmit">
      <Aviso v-if="erro" tom="vermelho">{{ erro }}</Aviso>
      <Aviso v-if="conflito" tom="ouro">
        Já existe um boletim para esta semana (<a :href="`/boletim/${conflito.id}`" class="font-semibold underline">BI nº {{ String(conflito.numero).padStart(3, "0") }}/{{ conflito.ano }}</a>).
        Clique novamente em criar para registrar um novo mesmo assim (retificação).
      </Aviso>

      <Campo rotulo="Semana (segunda-feira)" obrigatorio dica="A escala da semana é a base da Seção I.">
        <input v-model="semana" type="date" name="semana" :class="classeInput" required />
      </Campo>

      <div class="flex flex-wrap items-center gap-3">
        <button type="submit" :disabled="pendente" :class="classeBotaoPrimario">
          {{ pendente ? "Criando..." : confirmado ? "Confirmar criação" : "Criar boletim" }}
        </button>
        <a :class="classeBotaoSecundario" href="/boletim">Cancelar</a>
      </div>
    </form>
  </div>
</template>
```

- [ ] **Step 3: `src/components/BoletimDetalheView.vue`**

```vue
<script setup lang="ts">
import { computed, ref } from "vue";
import Badge from "./Badge.vue";
import Card from "./Card.vue";
import Aviso from "./Aviso.vue";
import CabecalhoPagina from "./CabecalhoPagina.vue";
import Icone from "./Icone.vue";
import { addDias, formatBR, formatDataHora } from "../lib/datas.js";
import {
  rotuloStatusBoletim, tomStatusBoletim,
  classeBotaoPrimario, classeBotaoSecundario, classeBotaoPerigo, classeInput, classeTd, classeTh,
} from "./ui.js";

const props = defineProps<{ registroId: number }>();

const carregando = ref(true);
const erro = ref("");
const visao = ref<any>(null);
const papel = ref("");
const msg = ref("");
const acaoErro = ref("");
const ocupado = ref(false);
const secao2 = ref("");
const secao3 = ref("");
const secao4 = ref("");

const boletim = computed(() => visao.value?.boletim ?? null);
const publicado = computed(() => boletim.value?.status === "publicado");
const ehAdmin = computed(() => papel.value === "admin");
const numeroFmt = computed(() => boletim.value ? `BI nº ${String(boletim.value.numero).padStart(3, "0")}/${boletim.value.ano}` : "");
const semanaISO = computed(() => boletim.value ? String(boletim.value.semana).slice(0, 10) : "");

function paragrafos(texto: string): string[] {
  const t = (texto ?? "").trim();
  return t ? t.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean) : ["Sem registro."];
}

async function carregar() {
  carregando.value = true; erro.value = "";
  try {
    const r = await fetch(`/api/boletins/${props.registroId}`);
    const j = await r.json();
    if (j.ok) {
      visao.value = j.dados;
      papel.value = j.dados.papel;
      secao2.value = j.dados.boletim.secao2 ?? "";
      secao3.value = j.dados.boletim.secao3 ?? "";
      secao4.value = j.dados.boletim.secao4 ?? "";
    } else erro.value = j.erro ?? "Falha ao carregar.";
  } catch {
    erro.value = "Falha de rede.";
  } finally {
    carregando.value = false;
  }
}
carregar();

async function post(acao: string, body: unknown) {
  const r = await fetch(`/api/boletins?acao=${acao}`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
  });
  return r.json();
}

async function salvar() {
  acaoErro.value = ""; msg.value = ""; ocupado.value = true;
  try {
    const fd = new FormData();
    fd.set("id", String(props.registroId));
    fd.set("secao2", secao2.value); fd.set("secao3", secao3.value); fd.set("secao4", secao4.value);
    const r = await fetch("/api/boletins", { method: "POST", body: fd });
    const j = await r.json();
    if (j.ok) msg.value = j.sucesso ?? "Boletim salvo.";
    else acaoErro.value = j.erro ?? "Falha ao salvar.";
  } catch { acaoErro.value = "Falha de rede."; } finally { ocupado.value = false; }
}

async function publicar() {
  if (!confirm("Publicar o boletim? A escala será congelada e o documento ficará somente leitura.")) return;
  acaoErro.value = ""; msg.value = ""; ocupado.value = true;
  try {
    const j = await post("publicar", { id: props.registroId });
    if (j.ok) { msg.value = j.sucesso ?? "Boletim publicado."; await carregar(); }
    else acaoErro.value = j.erro ?? "Falha ao publicar.";
  } catch { acaoErro.value = "Falha de rede."; } finally { ocupado.value = false; }
}

async function excluir() {
  if (!confirm("Excluir este rascunho? A ação não pode ser desfeita.")) return;
  acaoErro.value = ""; msg.value = ""; ocupado.value = true;
  try {
    const j = await post("excluir", { id: props.registroId });
    if (j.ok) window.location.href = "/boletim";
    else acaoErro.value = j.erro ?? "Falha ao excluir.";
  } catch { acaoErro.value = "Falha de rede."; } finally { ocupado.value = false; }
}

function imprimir() { window.print(); }
</script>

<template>
  <div v-if="carregando" class="rounded-xl border border-campo-200 bg-white p-10 text-center text-sm text-campo-500">Carregando boletim…</div>
  <Aviso v-else-if="erro" tom="vermelho">{{ erro }} <a href="/boletim" class="font-semibold underline">Voltar</a></Aviso>
  <template v-else-if="visao && boletim">
    <div class="sem-impressao">
      <CabecalhoPagina
        :titulo="numeroFmt"
        :descricao="`Semana de ${formatBR(semanaISO)} a ${formatBR(addDias(semanaISO, 6))}`"
        :migalhas="[{ rotulo: 'Boletim interno', href: '/boletim' }, { rotulo: numeroFmt }]"
      >
        <template #acoes>
          <button type="button" :class="classeBotaoSecundario" @click="imprimir"><Icone nome="impressora" className="h-4 w-4" /> Imprimir</button>
          <a :href="`/api/boletins/${registroId}/pdf`" target="_blank" rel="noreferrer" :class="classeBotaoPrimario"><Icone nome="download" className="h-4 w-4" /> Baixar PDF</a>
          <button v-if="!publicado" type="button" :disabled="ocupado" :class="classeBotaoSecundario" @click="salvar">Salvar</button>
          <button v-if="ehAdmin && !publicado" type="button" :disabled="ocupado" :class="classeBotaoPrimario" @click="publicar">Publicar</button>
          <button v-if="ehAdmin && !publicado" type="button" :disabled="ocupado" :class="classeBotaoPerigo" @click="excluir">Excluir</button>
        </template>
      </CabecalhoPagina>
    </div>

    <div class="sem-impressao space-y-3">
      <Aviso v-if="acaoErro" tom="vermelho">{{ acaoErro }}</Aviso>
      <Aviso v-if="msg" tom="verde">{{ msg }}</Aviso>
      <Aviso v-if="publicado" tom="azul">Boletim publicado: somente leitura. A Seção I reflete a escala congelada no ato da publicação.</Aviso>
    </div>

    <div class="mt-4 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
      <article class="area-impressao rounded-xl border border-campo-200 bg-white p-8 shadow-sm">
        <header class="border-b border-campo-200 pb-4 text-center">
          <p class="text-[11px] font-semibold uppercase tracking-[0.2em] text-campo-600">Governo de Rondônia — Polícia Militar</p>
          <p class="mt-1 text-xs uppercase tracking-wide text-campo-500">Junta de Inspeção de Saúde — JIS</p>
          <h2 class="mt-4 font-[family-name:var(--font-documento)] text-2xl font-semibold text-campo-950">BOLETIM INTERNO</h2>
          <p class="mt-1 text-sm font-semibold text-campo-700">{{ numeroFmt }}</p>
          <p class="text-xs text-campo-500">Semana de {{ formatBR(semanaISO) }} a {{ formatBR(addDias(semanaISO, 6)) }} · {{ rotuloStatusBoletim(boletim.status) }}</p>
        </header>

        <section class="mt-6">
          <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">I – ESCALA DE SERVIÇO</h3>
          <div v-for="dia in visao.escala.dias" :key="dia.dia" class="mt-3">
            <template v-if="dia.setores.length > 0">
              <p class="text-sm font-semibold text-campo-900">{{ dia.rotulo }} — {{ formatBR(addDias(semanaISO, dia.dia)) }}</p>
              <table class="mt-1 w-full border-collapse text-sm">
                <thead><tr><th :class="classeTh">Setor</th><th :class="classeTh">Turno</th><th :class="classeTh">Pessoa</th><th :class="classeTh">Observação</th></tr></thead>
                <tbody>
                  <template v-for="setor in dia.setores" :key="`${dia.dia}-${setor.setor}`">
                    <tr v-for="item in setor.itens" :key="`${setor.setor}-${item.turno}-${item.pessoaNome}`">
                      <td :class="classeTd">{{ setor.setor }}</td>
                      <td :class="classeTd">{{ item.turno }}</td>
                      <td :class="classeTd">{{ item.pessoaNome }}</td>
                      <td :class="classeTd">{{ item.observacao ?? "—" }}</td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </template>
          </div>
          <p v-if="visao.escala.dias.every((d: any) => d.setores.length === 0)" class="mt-2 text-sm text-campo-500">Sem escala cadastrada para esta semana.</p>
        </section>

        <section class="mt-6 space-y-4">
          <div>
            <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">II – ORDENS DE SERVIÇO</h3>
            <p v-for="(p, i) in paragrafos(secao2)" :key="i" class="mt-1 font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ p }}</p>
          </div>
          <div>
            <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">III – ASSUNTOS ADMINISTRATIVOS</h3>
            <p v-for="(p, i) in paragrafos(secao3)" :key="i" class="mt-1 font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ p }}</p>
          </div>
          <div>
            <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-campo-800">IV – COMUNICADOS</h3>
            <p v-for="(p, i) in paragrafos(secao4)" :key="i" class="mt-1 font-[family-name:var(--font-documento)] text-[15px] leading-relaxed text-campo-900">{{ p }}</p>
          </div>
        </section>
      </article>

      <div class="sem-impressao space-y-6">
        <Card titulo="Situação">
          <div class="flex flex-wrap items-center gap-2">
            <Badge :tom="tomStatusBoletim(boletim.status)">{{ rotuloStatusBoletim(boletim.status) }}</Badge>
          </div>
          <dl class="mt-4 grid gap-3 text-sm">
            <div><dt class="text-xs uppercase tracking-wide text-campo-500">Criado em</dt><dd class="text-campo-900">{{ formatDataHora(boletim.criadoEm) }}</dd></div>
            <div><dt class="text-xs uppercase tracking-wide text-campo-500">Publicado em</dt><dd class="text-campo-900">{{ boletim.publicadoEm ? formatDataHora(boletim.publicadoEm) : "não publicado" }}</dd></div>
          </dl>
        </Card>

        <Card v-if="!publicado" titulo="Editar seções II a IV" descricao="Separe parágrafos com uma linha em branco.">
          <div class="space-y-4">
            <label class="block"><span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">II – Ordens de Serviço</span>
              <textarea v-model="secao2" :class="classeInput" rows="3" /></label>
            <label class="block"><span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">III – Assuntos Administrativos</span>
              <textarea v-model="secao3" :class="classeInput" rows="3" /></label>
            <label class="block"><span class="mb-1 block text-xs font-semibold uppercase tracking-wide text-campo-600">IV – Comunicados</span>
              <textarea v-model="secao4" :class="classeInput" rows="3" /></label>
            <button type="button" :disabled="ocupado" :class="classeBotaoPrimario" @click="salvar">Salvar seções</button>
          </div>
        </Card>

        <Card titulo="Trilha de auditoria" :corpo="false">
          <ul class="divide-y divide-campo-100">
            <li v-for="evento in visao.eventos" :key="evento.id" class="px-5 py-3 text-sm">
              <p class="font-semibold text-campo-900">{{ evento.acao.replace(/_/g, " ") }}</p>
              <p class="text-campo-700">{{ evento.resumo }}</p>
              <p class="text-xs text-campo-500">{{ formatDataHora(evento.criadoEm) }} · {{ evento.usuarioNome }}</p>
            </li>
            <li v-if="visao.eventos.length === 0" class="px-5 py-4 text-sm text-campo-500">Sem eventos registrados.</li>
          </ul>
        </Card>
      </div>
    </div>
  </template>
</template>
```

- [ ] **Step 4: Páginas**

`src/pages/boletim/index.astro`:

```astro
---
import AppLayout from "../../layouts/AppLayout.astro";
import BoletinsView from "../../components/BoletinsView.vue";
import { dadosLayout } from "../../lib/layout-data.js";

const layout = await dadosLayout(Astro);
if (!layout) return Astro.redirect("/login?falha=1");

const ano = Astro.url.searchParams.get("ano") ?? "todos";
const status = Astro.url.searchParams.get("status") ?? "todos";
const busca = Astro.url.searchParams.get("busca") ?? "";
---
<AppLayout usuario={layout.usuario} contadores={layout.contadores}>
  <BoletinsView client:load ano={ano} status={status} busca={busca} />
</AppLayout>
```

`src/pages/boletim/novo.astro`:

```astro
---
import AppLayout from "../../layouts/AppLayout.astro";
import FormularioBoletim from "../../components/FormularioBoletim.vue";
import { dadosLayout } from "../../lib/layout-data.js";

const layout = await dadosLayout(Astro);
if (!layout) return Astro.redirect("/login?falha=1");

function segundaAtualISO(): string {
  const agora = new Date();
  const dia = (agora.getDay() + 6) % 7;
  const segunda = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - dia);
  const a = String(segunda.getFullYear()).padStart(4, "0");
  const m = String(segunda.getMonth() + 1).padStart(2, "0");
  const d = String(segunda.getDate()).padStart(2, "0");
  return `${a}-${m}-${d}`;
}

const bruto = (Astro.url.searchParams.get("semana") ?? "").trim();
const semana = /^\d{4}-\d{2}-\d{2}$/.test(bruto) ? bruto : segundaAtualISO();
---
<AppLayout usuario={layout.usuario} contadores={layout.contadores}>
  <FormularioBoletim client:load semana={semana} />
</AppLayout>
```

`src/pages/boletim/[id].astro`:

```astro
---
import AppLayout from "../../layouts/AppLayout.astro";
import BoletimDetalheView from "../../components/BoletimDetalheView.vue";
import { dadosLayout } from "../../lib/layout-data.js";

const layout = await dadosLayout(Astro);
if (!layout) return Astro.redirect("/login?falha=1");
const id: number = Number(Astro.params.id);
if (!Number.isFinite(id)) return Astro.redirect("/boletim");
---
<AppLayout usuario={layout.usuario} contadores={layout.contadores}>
  <BoletimDetalheView client:load registroId={id} />
</AppLayout>
```

- [ ] **Step 5: Sidebar**

Em `src/components/Sidebar.vue`, adicionar após a linha 22 (Relatórios P1) o item:

```ts
  { href: "/boletim", rotulo: "Boletim interno", icone: "documento", papeis: ["admin", "medico", "secretaria", "pessoal"], grupo: "Publicações" },
```

- [ ] **Step 6: Atalho na escala**

Em `src/components/EscalaView.vue`, dentro do `<template #acoes>` (após o botão Imprimir, linha 121), acrescentar:

```vue
      <a :class="classeBotaoSecundario" :href="`/boletim/novo?semana=${semana}`"><Icone nome="documento" className="h-4 w-4" /> Gerar boletim</a>
```

- [ ] **Step 7: Verificar**

Run: `npm run build` e `npm run typecheck` e `npm run lint`
Expected: build `Complete!`; 0 erros / 0 problemas.
Fluxo manual: `/escala` → "Gerar boletim" → `/boletim/novo` → criar → editar seções II–IV → salvar → publicar (admin) → conferir somente leitura + PDF; login perfil `pessoal` → criar/editar rascunho funciona, publicar/excluir ausentes (HTTP 403 na API).
Commit: `git add src/components/BoletinsView.vue src/components/FormularioBoletim.vue src/components/BoletimDetalheView.vue src/pages/boletim src/components/Sidebar.vue src/components/EscalaView.vue && git commit -m "feat(boletim): telas, pagina e atalho do boletim interno"`

---

## Self-Review

1. **Spec coverage:**
   - §2 Dados/numeração/snapshot/estados → Task 1 (tabela/tipo) + Task 2 (`criarBoletim` numeração, `publicarBoletim` snapshot, `escalaLive` em `escalaEfetiva`, bloqueio de edição).
   - §3 Páginas/componentes/atalho/sidebar → Task 5.
   - §4 API/regras/auditoria → Task 4 (rotas) + Task 2 (RBAC `exigirSessao`/`exigirPapel`, ações de auditoria).
   - §5 PDF → Task 3 + rota em Task 4.
   - §6 Validação → steps de verificação por task + fluxo manual no Task 5.
2. **Placeholder scan:** sem TBD/TODO; SQL, TS e Vue completos; comandos exatos.
3. **Type consistency:** `Boletim` idêntico entre schema, server e actions; `EscalaBoletim`/`SecaoBoletim`/`GradeSemana` definidos só em `src/lib/boletim.ts` e reutilizados em server/actions/pdf; nomes de action (`criarBoletim/salvarBoletim/publicarBoletim/excluirBoletim`) iguais entre actions e endpoints; envelope `{ ok, dados/erro }`; ações de auditoria conforme Global Constraints.
