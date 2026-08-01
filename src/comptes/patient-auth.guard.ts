import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

// Les jetons patients sont signes avec une CLE DERIVEE differente de celle du
// personnel : un jeton patient presente sur une route du personnel est donc
// rejete comme invalide, et inversement. Deux mondes, deux serrures.
export function clePatient(): string {
  return `${process.env.JWT_SECRET}.patient`;
}

@Injectable()
export class PatientAuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}

  async canActivate(contexte: ExecutionContext): Promise<boolean> {
    const requete = contexte.switchToHttp().getRequest();
    const entete: string = requete.headers['authorization'] ?? '';
    const jeton = entete.startsWith('Bearer ') ? entete.slice(7) : null;
    if (!jeton) throw new UnauthorizedException('Connexion requise');

    try {
      const identite = await this.jwt.verifyAsync(jeton, {
        secret: clePatient(),
      });
      if (identite.typ !== 'patient') throw new Error();
      requete.comptePatient = identite;
      return true;
    } catch {
      throw new UnauthorizedException('Session invalide ou expiree');
    }
  }
}
