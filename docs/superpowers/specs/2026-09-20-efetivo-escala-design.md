# Design: Efetivo e Escala de Serviço da Junta

Data: 2026-09-20
Status: aprovado pelo usuário
Decisões: efetivo misto (vínculo a militares + avulsos); escala semanal; setores com lista padrão ajustável; leitura todos logados, escrita só admin.

## 1. Contexto e objetivo

Toda Junta Médica de Saúde tem efetivo de trabalho. O diretor precisa controlar
esse efetivo e montar a escala de serviço por setor. Subsistema novo, sem fluxo
existente para reaproveitar além dos padrões (shell Astro + ilhas Vue + API JSON
+ SDK InsForge server-side, sessão cookie HMAC, RBAC admin/medico/secretaria/pessoal).

Fora de escopo: ponto/frequência, folha, InsForge Auth, Storage, realtime.

## 2. Dados (migration, schema public)

- `setores(id serial pk, nome text nn unique, descricao text, ativo boolean nn default true)`
- `efetivo(id serial pk, militar_id integer null references militares(id) on delete set null,
  nome text nn, posto_graduacao text, funcao text, telefone text,
  ativo boolean nn default true,
  criado_em timestamptz nn default now(), atualizado_em timestamptz nn default now())`
  - Regra: se `militar_id` preenchido, `nome`/`posto_graduacao` espelham o cadastro
    de policiais militares no momento do vínculo (cópia, não referência viva —
    evita join e preserva histórico se o cadastro mudar).
- `escalas(id serial pk, semana date nn (segunda-feira da semana),
  dia smallint nn check 0–6 (0=segunda), turno text nn check
  ('manhã','tarde','integral','plantão'),
  setor_id integer nn references setores(id) on delete cascade,
  efetivo_id integer nn references efetivo(id) on delete cascade,
  observacao text,
  criado_por integer, criado_em timestamptz nn default now())`
- Índice unique `(semana, dia, turno, setor_id, efetivo_id)` contra duplicata.
- Seed (idempotente, só se `setores` vazio): Recepção, Secretaria, Sala Médica,
  Arquivo, Perícia, Direção. Setores renomeáveis/desativáveis pelo diretor
  (sem delete físico se houver escalas — usa `ativo=false`).

## 3. Páginas e componentes

- `/efetivo` (todos logados): tabela (nome, posto, função, setor atual?,
  origem vínculo/avulso, situação) + busca; admin: novo, editar, ativar/desativar,
  vincular a policial militar (busca por nome/RE).
  Ilhas: `EfetivoView.vue`, `FormularioEfetivo.vue`.
- `/escala` (todos logados): grade semanal Seg–Dom × setores com seletor de
  semana (anterior/atual/próxima + date); admin: adicionar plantão
  (dia, turno, setor, pessoa, obs), remover, impressão (`sem-impressao`/
  `area-impressao` como na ata).
  Ilhas: `EscalaView.vue`, `FormularioEscala.vue`.
- Sidebar: grupo novo "Efetivo" com os dois itens (visível a todos logados).

## 4. API e regras

- `GET /api/efetivo` (lista + busca), `POST /api/efetivo` (criar/editar/status,
  admin), `GET/POST /api/setores` (criar/renomear/status admin),
  `GET /api/escalas?semana=YYYY-MM-DD` (grade da semana),
  `POST /api/escalas` (adicionar/remover, admin).
- Leitura: qualquer sessão válida. Escrita: `exigirPapel("admin")` → 403 demais.
- Auditoria (`REGISTRAR_EFETIVO`, `EDITAR_EFETIVO`, `STATUS_EFETIVO`,
  `SETOR_*`, `EMITIR_ESCALA`, `REMOVER_ESCALA`) em toda mutação.
- Erros seguem `ResultadoAcao { ok, erro?, sucesso?, id? }`.

## 5. Validação

Migration aplicada; build + typecheck (0 erros); seed dos 6 setores;
fluxo completo com login admin: criar avulso, vincular militar, montar semana,
imprimir; leitura com perfil pessoal.

---

## Spec self-review

1. Placeholder scan: sem TBD/TODO; tabelas, endpoints, validações explícitos.
2. Consistência: leitura todos vs escrita admin em dados, API e páginas — ok;
   cópia (não referência) de nome/posto documentada na regra do vínculo.
3. Escopo: um subsistema coeso (3 tabelas, 2 páginas); cabe num plano só.
4. Ambiguidade: `dia 0–6 = segunda–domingo` explícito; `semana` = data da
   segunda-feira explícito; turnos fechados em 4 valores explícitos.
