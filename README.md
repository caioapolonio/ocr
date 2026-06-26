# Carteirinha OCR

App **offline-first** que lê carteirinhas de estudante físicas via **OCR on-device** (ML Kit),
armazena localmente e **sincroniza** com um backend quando há internet. Projeto open-source de
estudos em **React Native (Expo)** + **Node.js/TypeScript**.

> 📄 A especificação completa (fonte única da verdade) está em [`specs.md`](./specs.md).

## Stack

- **Monorepo:** pnpm workspaces + Turborepo · TypeScript estrito
- **Mobile:** Expo SDK 56 · Expo Router · expo-camera · ML Kit · expo-sqlite + Drizzle · TanStack Query
- **Backend:** Fastify 5 · PostgreSQL · Drizzle · Zod · OpenAPI
- **Compartilhado:** `@ocr/core` (modelo de dados, schemas Zod, parser de OCR)

## Estrutura

```
apps/
  mobile/   # app Expo (a partir do M2)
  api/      # backend Fastify + Drizzle/Postgres (REST /api/v1/cards)
packages/
  core/     # @ocr/core — domínio compartilhado (schemas + parser)
  tsconfig/ # base de TypeScript
  eslint-config/ # regras de lint
```

## Começando

Pré-requisitos: **Node 24+**, **pnpm 11+** (e Docker para o Postgres a partir do M1).

```bash
pnpm install          # instala todas as dependências do workspace
pnpm check            # typecheck + lint + testes em todos os pacotes
pnpm build            # builda os pacotes (gera dist/ em @ocr/core)
```

Scripts úteis (Turborepo):

```bash
pnpm test             # roda os testes (Vitest)
pnpm typecheck        # checagem de tipos
pnpm lint             # ESLint
```

## Status

Veja o **Roadmap** em [`specs.md`](./specs.md#13-roadmap). Estado atual: **M1 — Backend MVP**
(API REST `/api/v1/cards` em Fastify + Drizzle/Postgres, com OpenAPI em `/docs`).

### Rodando a API (M1)

```bash
cp .env.example apps/api/.env          # ajuste se necessário (credenciais locais)
docker compose up -d                   # Postgres local
pnpm --filter @ocr/api db:migrate      # aplica as migrations
pnpm --filter @ocr/api dev             # API em http://localhost:3333 (Swagger em /docs)
```

## Licença

MIT.
