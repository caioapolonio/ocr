import type { UserRecord, UsersRepository } from './users.repository';

/** Repositório de usuários em memória — usado nos testes (sem Postgres). */
export class InMemoryUsersRepository implements UsersRepository {
  private readonly store = new Map<string, UserRecord>();

  findByEmail(email: string): Promise<UserRecord | null> {
    const found = [...this.store.values()].find((user) => user.email === email);
    return Promise.resolve(found ? { ...found } : null);
  }

  findById(id: string): Promise<UserRecord | null> {
    const user = this.store.get(id);
    return Promise.resolve(user ? { ...user } : null);
  }

  create(user: UserRecord): Promise<UserRecord> {
    this.store.set(user.id, { ...user });
    return Promise.resolve({ ...user });
  }
}
