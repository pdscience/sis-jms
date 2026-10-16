# Design: Boletim Interno da Junta

Data: 2026-10-15
Status: aprovado pelo usuário
Decisões: registro oficial persistido; 4 seções fixas (I Escala de Serviço automática,
II Ordens de Serviço, III Assuntos Administrativos, IV Comunicados); uma semana por
boletim; numeração sequencial por ano; fluxo Rascunho→Publicado; todos editam rascunho,
admin publica/exclui; saída tela + PDF A4; página `/boletim` + atalho na escala.

## 1. Contexto e objetivo

A Junta já mantém a escala semanal de serviço (`setores`, `efetivo`, `escalas`, ver
`2026-09-20-efetivo-escala-design.md`). O Boletim Interno (BI) é o documento oficial
que publica, entre outros assuntos, a escala de serviço. Este subsistema cria o BI a
partir da escala da semana, com seções administrativas fixas, numeração oficial,
ciclo de vida rascunho/publicado e emissão em tela e PDF.

Segue os padrões vigentes: shell Astro + ilhas Vue + API JSON + SDK InsForge
server-side, sessão cookie HMAC, RBAC admin/medico/secretaria/pessoal, auditoria.

Fora de escopo: Boletim Geral, assinatura digital, InsForge Auth/Storage/realtime,
modelos reutilizáveis de boletim, múltiplas semanas por boletim, despublicação.

## 2. Dados (migration, schema public)

Nova tabela `boletins` (única tabela nova):

- `boletins(id serial pk, numero integer not null, ano integer not null,
  semana date not null, status text not null default 'rascunho'
  check (status in ('rascunho','publicado')),
  secao2 text, secao3 text, secao4 text,
  escala_snapshot jsonb,
  criado_por integer, criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  publicado_por integer, publicado_em timestamptz)`
- Índice unique `(ano, numero)` contra duplicidade de numeração.
- `semana` = segunda-feira da semana coberta (mesma convenção de `escalas.semana`).
- `escala_snapshot` = JSON congelado da Seção I, gravado no ato de publicar.

Regras:

- **Numeração:** ao criar, `numero = max(numero do mesmo ano) + 1`. O `ano` é o ano da
  segunda-feira da `semana` (mantém `(ano, numero)` estável mesmo quando a semana cruza
  o revezamento de ano). O índice unique é a trava; em conflito, a action tenta uma vez
  de novo e, persistindo, devolve erro amigável.
- **Seção I:** no rascunho é lida ao vivo de `escalas` da semana; no publicado lê-se
  apenas `escala_snapshot`. O snapshot garante imutabilidade do documento oficial,
  mesmo que a escala venha a ser editada depois.
- **Estados:** `rascunho` editável por qualquer usuário logado; `publicado` somente
  leitura; sem despublicação. Exclusão permitida apenas em rascunho e por admin.
- **Tipo:** `Boletim` em `src/db/schema.ts` (camelCase; timestamps como string ISO;
  `escalaSnapshot: unknown | null`).

Forma do `escala_snapshot`:

```
{
  "semana": "YYYY-MM-DD",
  "geradoEm": "ISO",
  "dias": [
    { "dia": 0, "rotulo": "Segunda",
      "setores": [
        { "setor": "Recepção",
          "itens": [
            { "turno": "plantão", "pessoaNome": "3º Sargento Fulano",
              "observacao": null }
          ] }
      ] }
  ]
}
```

## 3. Páginas e componentes

- **`/boletim`** (todos logados): filtros por ano e status; tabela com Nº/ano, semana
  coberta, situação, criado em; ações Abrir e PDF (PDF só quando publicado). Botão
  **Novo boletim**. Ilha `BoletinsView.vue`.
- **`/boletim/novo`** (todos logados): seletor da semana (segunda-feira). Se já existir
  boletim daquela semana, exibe aviso com link para o existente e exige confirmação
  para criar outro (retificação). Cria o rascunho e redireciona a `/boletim/[id]`.
  Ilha `FormularioBoletim.vue`.
- **`/boletim/[id]`** (todos logados): cabeçalho institucional (OM, Nº/ano, semana,
  situação, datas de criação/publicação) e as quatro seções:
  - **I – Escala de Serviço:** grade somente leitura por dia → setor → turno → pessoa
    (rascunho: escala ao vivo; publicado: snapshot).
  - **II – Ordens de Serviço · III – Assuntos Administrativos · IV – Comunicados:**
    textareas editáveis apenas em rascunho; somente leitura quando publicado.
  - Ações: **Salvar** (rascunho) · **Publicar** (admin, com confirmação; congela a
    Seção I) · **Baixar PDF** (sempre) · **Imprimir** · **Excluir** (admin, só rascunho).
  Ilha `BoletimDetalheView.vue`.
- **Atalho na escala:** botão "Gerar boletim da semana" em `/escala`, abrindo
  `/boletim/novo` com a semana preenchida.
- **Sidebar:** item "Boletim interno" no grupo **Publicações** (todos os papéis), ícone
  de documento.
- **Extrair para `EscalaDetalhe`?** Não. A grade é reimplementada de forma enxuta em
  `src/lib/boletim.ts`, reutilizando o formato de `gradeSemana`.

## 4. API e regras

- `GET /api/boletins?ano=&status=&busca=` → lista.
- `GET /api/boletins/[id]` → boletim + seções + escala efetiva + papel + eventos de
  auditoria da entidade `boletim`.
- `POST /api/boletins` → form `{ semana }` cria rascunho; form `{ id, secao2, secao3,
  secao4 }` salva textos; JSON `?acao=publicar { id }` publica; JSON `?acao=excluir
  { id }` exclui.
- `GET /api/boletins/[id]/pdf` → PDF A4 (`application/pdf`, `inline`,
  `Cache-Control: no-store`).
- Leitura: qualquer sessão válida. Criar/editar rascunho: `exigirSessao` (qualquer
  papel). Publicar/excluir: `exigirPapel("admin")` (403 nos demais).
- Editar/excluir bloqueado quando `status = 'publicado'`; publicar bloqueado se já
  publicado. Erros seguem `ResultadoAcao { ok, erro?, sucesso?, id? }`.
- Auditoria: `CRIAR_BOLETIM`, `EDITAR_BOLETIM`, `PUBLICAR_BOLETIM`, `EXCLUIR_BOLETIM`,
  `EMITIR_PDF_BOLETIM`.

## 5. PDF

- `src/lib/boletim.ts`: `secoesTextoBoletim(boletim)` (II/III/IV) e
  `montarGradeEscala(semana, dadosEscala)` (Seção I, forma do snapshot).
- `gerarPdfBoletim(...)` em `src/lib/pdf.ts`, reusando os helpers de layout das Atas
  (cabeçalho institucional, quebra de linha, paginação e rodapé numerado). Desenha:
  "BOLETIM INTERNO", `BI nº NNN/AAAA`, semana coberta, situação; a Seção I como tabela
  (dia/setor/turno/pessoa/observação) e as seções II–IV como texto.

## 6. Validação

- Migration aplicada; `npm run typecheck` + `npm run lint` + `npm run build` sem erros.
- Fluxo curl completo: criar rascunho (perfil pessoal) → GET detalhe (rascunho mostra
  escala ao vivo) → salvar textos → publicar (admin) → GET detalhe (lê snapshot,
  somente leitura) → tentar editar publicado (falha) → PDF 200 `application/pdf` →
  excluir rascunho (admin) e tentar excluir publicado (falha).
- Permissões: pessoal cria/edita rascunho; não publica nem exclui.

---

## Spec self-review

1. Placeholder scan: sem TBD/TODO; tabela, colunas, endpoints, regras e validação
   explícitos.
2. Consistência: rascunho editável por todos vs publicar/excluir só admin aparece
   igual em §2 (estados), §3 (UI) e §4 (API); snapshot é a única fonte da Seção I no
   publicado em §2, §3 e §5.
3. Escopo: um subsistema coeso (1 tabela, 3 páginas, 3 rotas); cabe num plano só.
4. Ambiguidade: `semana` = segunda-feira explícito; `ano` = ano da semana explícito;
   numeração, forma do snapshot e bloqueios de edição definidos; recriação da mesma
   semana exige confirmação (sem unique em `semana`).
