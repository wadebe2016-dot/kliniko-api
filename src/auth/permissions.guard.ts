import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY } from './permissions.decorator';

// Garde global : vérifie que l'utilisateur connecté possède
// la ou les permissions déclarées par la route via @Permissions(...).
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requises = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );
    // Route sans exigence déclarée : on laisse passer
    // (le garde JWT a déjà fait son travail).
    if (!requises || requises.length === 0) return true;

    const utilisateur = context.switchToHttp().getRequest().user;
    if (!utilisateur) return true; // route publique, rien à vérifier

    const possedees: string[] = utilisateur.permissions ?? [];
    const autorise = requises.every((p) => possedees.includes(p));

    if (!autorise) {
      throw new ForbiddenException(
        `Permission requise : ${requises.join(', ')}`,
      );
    }
    return true;
  }
}
