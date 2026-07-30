import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { IS_PUBLIC_KEY } from './public.decorator';

// Garde global : toute route exige un jeton JWT valide,
// sauf celles marquees @Public().
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const estPublique = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (estPublique) return true;

    const requete = context.switchToHttp().getRequest();
    const enTete: string | undefined = requete.headers['authorization'];
    const jeton = enTete?.startsWith('Bearer ')
      ? enTete.slice('Bearer '.length)
      : undefined;

    if (!jeton) {
      throw new UnauthorizedException('Jeton manquant');
    }

    try {
      const identite = await this.jwtService.verifyAsync(jeton);
      // L'identite (id utilisateur, hopitalId, roles, permissions)
      // devient disponible dans les controleurs via req.user.
      requete.user = identite;
    } catch {
      throw new UnauthorizedException('Jeton invalide ou expire');
    }
    return true;
  }
}
