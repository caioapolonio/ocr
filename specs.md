# Carteirinha OCR — Especificação (Single Source of Truth)

> Documento vivo. Toda decisão de produto/arquitetura nasce ou é registrada aqui.
> Última atualização: 2026-06-26.

## 1. Visão Geral

App mobile (React Native/Expo) que digitaliza **carteirinhas de estudante** físicas via
**OCR on-device**, funciona **offline-first** e **sincroniza** com um backend Node/TypeScript quando
há internet. Foco em **privacidade** (a imagem nunca sai do aparelho por padrão) e em **valor de
estudo** (código claro, camadas explícitas e testável).

## 2. Objetivos e Não-Objetivos

**Objetivos**
- Capturar a carteirinha pela câmera e extrair os campos automaticamente (OCR local).
- Permitir revisão/correção dos dados antes de salvar.
- CRUD totalmente offline; consultar sem internet.
- Sincronização bidirecional com resolução de conflito ao reconectar.
- Base open-source legível, tipada de ponta a ponta e com testes.

**Não-objetivos (v1)**
- Validar a autenticidade da carteirinha junto a órgãos emissores.
- Login social / multiusuário (planejado para o M5).
- OCR em tempo real (live scan).

## 3. Personas & Histórias de Usuário

- *Como estudante*, quero fotografar minha carteirinha e ter os campos preenchidos sozinhos.
- *Como estudante*, quero revisar/corrigir os dados antes de salvar.
- *Como estudante offline*, quero salvar e consultar minhas carteirinhas sem internet.
- *Quando eu voltar a ter internet*, quero que tudo sincronize automaticamente.

## 4. Decisões de Arquitetura (ADRs)

| # | Decisão | Escolha | Consequência |
|---|---------|---------|--------------|
| 1 | OCR | **ML Kit on-device** (`@react-native-ml-kit/text-recognition`) | Offline e grátis. Exige **Expo Dev Client + EAS Build** (sem Expo Go). |
| 2 | Backend | **Fastify + REST** (+ Zod + OpenAPI/Swagger) | API desacoplada; tipos vêm de `@ocr/core`. |
| 3 | Persistência/sync | **expo-sqlite + Drizzle + outbox próprio** (LWW por `updatedAt`) | Controle total e didático. |
| 4 | Monorepo | **pnpm workspaces + Turborepo** | Tarefas com cache; código compartilhado em `packages/*`. |

## 5. Arquitetura (alto nível)

```
[ Câmera ] → [ ML Kit OCR (device) ] → [ Parser @ocr/core ] → [ Revisão ]
                                                                    │
                                          [ SQLite (Drizzle) ] ◄────┘
                                                    │  (offline-first)
                                          [ Outbox + Sync Engine ]
                                                    │  push/pull (online)
                                          [ Fastify REST API ] → [ PostgreSQL ]
```

**Princípios:** offline-first (a fonte da verdade local é o SQLite); separação de camadas (domínio
puro em `core`, infraestrutura em cada app); type-safety ponta a ponta via schemas Zod
compartilhados.

## 6. Modelo de Dados — `StudentCard`

Definido como **fonte da verdade** em `@ocr/core` (`studentCardSchema`), reutilizado no mobile
(SQLite) e na API (Postgres) por tipos inferidos.

```ts
StudentCard {
  id: string                  // UUID gerado no client (offline-first)
  fullName: string
  institution: string
  course?: string
  educationLevel?: 'fundamental'|'medio'|'tecnico'|'graduacao'|'pos'|'outro'
  registrationNumber?: string // matrícula / RG estudantil
  documentNumber?: string     // nº da carteirinha
  issuer?: string             // entidade emissora (UNE, UBES, ANPG, DCE...)
  cpf?: string                // SENSÍVEL — opcional; não sincroniza por padrão
  birthDate?: string          // YYYY-MM-DD
  validUntil?: string         // YYYY-MM-DD (validade)
  photoUri?: string           // LOCAL-ONLY (não sincroniza)
  rawOcrText: string          // texto bruto p/ auditoria e re-parse
  ocrConfidence?: number      // 0..1
  // metadados de sincronização
  serverId?: string
  version: number             // incrementa a cada update
  syncStatus: 'pending'|'synced'|'conflict'
  createdAt: string           // ISO datetime
  updatedAt: string           // ISO datetime — base do Last-Write-Wins
  deletedAt?: string | null   // soft-delete (necessário p/ sync)
}
```

Schemas derivados: `createCardSchema` (campos de conteúdo), `updateCardSchema` (parcial).

## 7. Pipeline de OCR (mobile)

1. `expo-camera` captura a foto (fallback: `expo-image-picker`).
2. `expo-image-manipulator` normaliza (resize/rotate/contraste).
3. `@react-native-ml-kit/text-recognition` → `recognize(uri)` → blocos/linhas/texto.
4. `parseStudentCard(rawText)` (de `@ocr/core`, **função pura**) → campos + `confidence`.
5. Tela de **revisão**: o usuário confirma/corrige os campos.
6. Persiste no SQLite (`syncStatus='pending'`) e enfileira no `outbox`.

**Parser (heurísticas, em `@ocr/core`, testado com Vitest):** extração por rótulos + regex —
CPF `\d{3}\.\d{3}\.\d{3}-\d{2}`, datas `dd/mm/aaaa` para validade/nascimento, palavras-chave de
instituição (universidade/faculdade/instituto/etec…), rótulos "Matrícula/Registro". Desenho
**plugável por emissor** para evoluir a acurácia sem quebrar o restante.

## 8. Persistência Offline-First & Motor de Sync

- **Local:** SQLite via `expo-sqlite` + **Drizzle ORM** (migrations com `drizzle-kit`).
- **Outbox:** tabela `outbox(id, entity, op, entityId, payload, createdAt)` registra cada mutação
  (`create|update|delete`) feita offline.
- **Triggers de sync:** app em foreground (`AppState`), reconexão (`expo-network`/NetInfo),
  pull-to-refresh manual e após mutação local (debounced) quando online.
- **Protocolo (REST):**
  - `POST /api/v1/sync/push` → `{ lastPulledAt, changes: { cards: { created, updated, deleted } } }`
    → `{ accepted, conflicts[], serverTime }`.
  - `GET /api/v1/sync/pull?since=<ISO>` → `{ serverTime, changes: { cards: { ... } } }`.
  - REST padrão para depuração: `GET/POST/PUT/DELETE /api/v1/cards`.
- **Conflitos:** **Last-Write-Wins** por `updatedAt`. Se o servidor tiver `updatedAt` mais novo,
  o servidor vence e o registro é marcado `conflict` no client para revisão.

(Contratos de sync já tipados em `@ocr/core`: `syncPushRequestSchema`, `syncPushResponseSchema`,
`syncPullResponseSchema`.)

## 9. Backend (Fastify)

- **Fastify 5** + `fastify-type-provider-zod` (schemas vindos de `@ocr/core`).
- **OpenAPI**: `@fastify/swagger` + `@fastify/swagger-ui` em `/docs`.
- **DB**: PostgreSQL (via `docker-compose.yml`) + **Drizzle** (schema próprio em Postgres).
- **Infra**: validação de env com Zod (`env.ts`), logs `pino`, error handler central.
- **Auth (M5):** `@fastify/jwt` + escopo por usuário (a v1 começa anônima / por device).

## 10. Privacidade & Segurança (LGPD-aware)

- OCR **on-device** → a **imagem nunca sai do aparelho** por padrão; `photoUri` é local-only.
- **CPF** é opcional e **não sincroniza** por padrão.
- O backend recebe apenas os **dados estruturados mínimos**.
- Comunicação via HTTPS; segredos fora do repositório (`.env`, exemplos em `.env.example`).
- Fixtures/testes usam apenas dados **sintéticos e anonimizados**.

## 11. Stack & Convenções

- Monorepo **pnpm + Turborepo**; TypeScript estrito; ESLint (flat config) + Prettier compartilhados.
- Testes com **Vitest**. Conventional Commits. Versão do Node fixada em `.nvmrc` (24).
- Pacotes internos sob o escopo `@ocr/*`.

## 12. Estrutura do Monorepo

```
ocr/
├─ apps/
│  ├─ mobile/      # Expo SDK 56 (Expo Router, câmera, ML Kit, SQLite/Drizzle, sync)
│  └─ api/         # Fastify + Postgres (REST /cards e /sync)
└─ packages/
   ├─ core/        # @ocr/core — modelo, schemas Zod e parser de OCR (puro)
   ├─ tsconfig/    # @ocr/tsconfig — base de TypeScript
   └─ eslint-config/ # @ocr/eslint-config — regras de lint
```

## 13. Roadmap

- **M0 — Fundação ✅ (atual):** monorepo, configs compartilhadas e `@ocr/core` (schemas + parser + testes).
- **M1 — Backend MVP:** Fastify + Postgres + Drizzle + REST `/cards` + Swagger.
- **M2 — Mobile base:** Expo + Router + Dev Client + expo-sqlite/Drizzle + telas com mock.
- **M3 — OCR on-device:** câmera + ML Kit + parser do `core` + tela de revisão.
- **M4 — Sync engine:** outbox + push/pull + LWW + triggers de conectividade.
- **M5 — Auth & hardening:** JWT, multiusuário, rate-limit, testes e2e.
- **M6 — Polimento:** UI (NativeWind), EAS Build, CI (GitHub Actions + Turbo), docs.
