export const APP_URL = import.meta.env.VITE_APP_URL || 'http://localhost:8000';

/**
 * Photos de profil uniquement.
 *
 * Les documents pédagogiques et les copies rendues vivent sur le disque privé et
 * ne sont accessibles que par l'URL signée renvoyée par l'API (`file_url`), jamais
 * en construisant un chemin côté client.
 */
export function avatarUrl(path) {
  return path ? `${APP_URL}/storage/${path}` : null;
}
