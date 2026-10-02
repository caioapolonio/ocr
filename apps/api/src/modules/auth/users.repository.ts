/** Registro interno de usuário — inclui o hash da senha (nunca exposto pela API). */
export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
}

/** Boundary de persistência de usuários (Postgres em produção, memória nos testes). */
export interface UsersRepository {
  findByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
  create(user: UserRecord): Promise<UserRecord>;
}
