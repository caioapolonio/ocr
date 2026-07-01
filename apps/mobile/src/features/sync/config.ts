/**
 * URL base da API para o sync. Definida em tempo de build por
 * `EXPO_PUBLIC_API_URL` (ex.: `http://192.168.0.10:3333` — o IP da máquina na
 * rede local; `localhost` não funciona a partir do celular).
 *
 * Sem a variável, o sync fica desativado e o app segue 100% offline.
 */
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/+$/, '');

export const SYNC_ENABLED = API_URL.length > 0;
