import { randomUUID } from 'node:crypto';
import type { AuthResponse, Credentials, PublicUser } from '@ocr/core';
import { hashPassword, verifyPassword } from './password';
import type { UserRecord, UsersRepository } from './users.repository';

export type RegisterResult =
  | { ok: true; data: AuthResponse }
  | { ok: false; reason: 'email-taken' };
export type LoginResult = { ok: true; data: AuthResponse } | { ok: false };

function toPublic(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

/**
 * Regras de autenticação. A assinatura do JWT é injetada (`signToken`) para
 * manter o serviço desacoplado do Fastify e testável isoladamente.
 */
export class AuthService {
  constructor(
    private readonly users: UsersRepository,
    private readonly signToken: (userId: string) => string,
  ) {}

  async register(credentials: Credentials): Promise<RegisterResult> {
    const email = credentials.email.toLowerCase();
    if (await this.users.findByEmail(email)) return { ok: false, reason: 'email-taken' };

    const user: UserRecord = {
      id: randomUUID(),
      email,
      passwordHash: hashPassword(credentials.password),
      createdAt: new Date().toISOString(),
    };
    await this.users.create(user);
    return { ok: true, data: { token: this.signToken(user.id), user: toPublic(user) } };
  }

  async login(credentials: Credentials): Promise<LoginResult> {
    const user = await this.users.findByEmail(credentials.email.toLowerCase());
    if (!user || !verifyPassword(credentials.password, user.passwordHash)) return { ok: false };
    return { ok: true, data: { token: this.signToken(user.id), user: toPublic(user) } };
  }
}
