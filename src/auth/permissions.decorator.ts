import { SetMetadata } from '@nestjs/common';

// Déclare la ou les permissions exigées par une route.
// Usage : @Permissions('patient.lire')
export const PERMISSIONS_KEY = 'permissionsRequises';
export const Permissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
