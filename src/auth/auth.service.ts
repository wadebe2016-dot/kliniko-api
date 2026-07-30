import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    // On charge l'utilisateur avec ses rôles et les permissions de ces rôles
    const utilisateur = await this.prisma.utilisateur.findFirst({
      where: { email: dto.email, deletedAt: null },
      include: {
        roles: {
          include: {
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
        },
      },
    });

    // Message volontairement identique dans tous les cas d'échec,
    // pour ne pas révéler si l'email existe ou non.
    if (!utilisateur || !utilisateur.actif) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const motDePasseValide = await bcrypt.compare(
      dto.motDePasse,
      utilisateur.motDePasse,
    );
    if (!motDePasseValide) {
      throw new UnauthorizedException('Identifiants incorrects');
    }

    const roles = utilisateur.roles.map((ur) => ur.role.code);
    const permissions = [
      ...new Set(
        utilisateur.roles.flatMap((ur) =>
          ur.role.permissions.map((rp) => rp.permission.code),
        ),
      ),
    ];

    await this.prisma.utilisateur.update({
      where: { id: utilisateur.id },
      data: { derniereConnexion: new Date() },
    });

    // Le contenu du jeton : c'est LUI qui porte désormais hopitalId.
    const identite = {
      sub: utilisateur.id,
      email: utilisateur.email,
      nom: utilisateur.nom,
      prenom: utilisateur.prenom,
      hopitalId: utilisateur.hopitalId,
      roles,
      permissions,
    };

    return {
      accessToken: await this.jwtService.signAsync(identite),
      utilisateur: {
        id: utilisateur.id,
        email: utilisateur.email,
        nom: utilisateur.nom,
        prenom: utilisateur.prenom,
        roles,
        permissions,
      },
    };
  }
}
