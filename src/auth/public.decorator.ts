import { SetMetadata } from '@nestjs/common';

// Marqueur pour les routes accessibles sans jeton (la connexion, essentiellement).
// Usage : @Public() au-dessus d'une route ou d'un contrôleur.
export const IS_PUBLIC_KEY = 'estPublique';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
