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
  api/      # backend Fastify (a partir do M1)
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

Veja o **Roadmap** em [`specs.md`](./specs.md#13-roadmap). Estado atual: **M0 — Fundação**
(monorepo + `@ocr/core` com schemas e parser testados).

## Licença

MIT.
