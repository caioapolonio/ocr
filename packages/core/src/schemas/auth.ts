import { z } from 'zod';
import { isoDateTime } from './primitives';

/** Credenciais de registro/login. */
export const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'A senha deve ter ao menos 8 caracteres'),
});
export type Credentials = z.infer<typeof credentialsSchema>;

/** Usuário exposto pela API (nunca inclui o hash da senha). */
export const publicUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  createdAt: isoDateTime,
});
export type PublicUser = z.infer<typeof publicUserSchema>;

/** Resposta de `/auth/register` e `/auth/login`. */
export const authResponseSchema = z.object({
  token: z.string(),
  user: publicUserSchema,
});
export type AuthResponse = z.infer<typeof authResponseSchema>;
