import { API_VERSION, authResponseSchema, type AuthResponse } from '@ocr/core';
import { API_URL } from '../sync/config';

const base = `${API_URL}/api/${API_VERSION}`;

async function post(path: string, email: string, password: string): Promise<AuthResponse> {
  const res = await fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  if (res.status === 401) throw new Error('Credenciais inválidas');
  if (res.status === 409) throw new Error('E-mail já cadastrado');
  if (!res.ok) throw new Error(`Falha na autenticação (HTTP ${res.status})`);
  return authResponseSchema.parse(await res.json());
}

export function register(email: string, password: string): Promise<AuthResponse> {
  return post('/auth/register', email, password);
}

export function login(email: string, password: string): Promise<AuthResponse> {
  return post('/auth/login', email, password);
}
