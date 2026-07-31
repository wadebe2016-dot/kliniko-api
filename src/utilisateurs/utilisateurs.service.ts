import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import {
  ChangerMotDePasseDto,
  ReinitialiserMotDePasseDto,
} from './dto/mot-de-passe.dto';

// Champs renvoyes au client : jamais le mot de passe.
const VUE = {
  id: true,
  email: true,
  nom: true,
  prenom: true,
  telephone: true,
  actif: true,
  derniereConnexion: true,
  createdAt: true,
  roles: {
    select: { role: { select: { id: true, code: true, libelle: true } } },
  },
};

@Injectable()
export class UtilisateursService {
  constructor(private readonly prisma: PrismaService) {}

  // Aplatit la relation utilisateur -> roles pour l affichage
  private presenter(u: any) {
    return {
      id: u.id,
      email: u.email,
      nom: u.nom,
      prenom: u.prenom,
      telephone: u.telephone,
      actif: u.actif,
      derniereConnexion: u.derniereConnexion,
      createdAt: u.createdAt,
      roles: (u.roles ?? []).map((ur: any) => ur.role),
    };
  }

  private async trouver(hopitalId: string, id: string) {
    const u = await this.prisma.utilisateur.findUnique({ where: { id } });
    if (!u || u.deletedAt || u.hopitalId !== hopitalId) {
      throw new NotFoundException(`Utilisateur ${id} introuvable`);
    }
    return u;
  }

  private async verifierRoles(hopitalId: string, roleIds: string[]) {
    const roles = await this.prisma.role.findMany({
      where: { hopitalId, id: { in: roleIds } },
    });
    if (roles.length !== roleIds.length) {
      throw new BadRequestException(
        'Un ou plusieurs roles sont introuvables dans cette clinique',
      );
    }
  }

  // Catalogue des roles de la clinique (pour alimenter le formulaire)
  async listerRoles(hopitalId: string) {
    return this.prisma.role.findMany({
      where: { hopitalId },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, libelle: true },
    });
  }

  async findAll(hopitalId: string) {
    const liste = await this.prisma.utilisateur.findMany({
      where: { hopitalId, deletedAt: null },
      orderBy: [{ actif: 'desc' }, { nom: 'asc' }],
      select: VUE,
    });
    return liste.map((u) => this.presenter(u));
  }

  async create(hopitalId: string, dto: CreateUtilisateurDto) {
    const existant = await this.prisma.utilisateur.findFirst({
      where: { hopitalId, email: dto.email },
    });
    if (existant) {
      throw new ConflictException('Un compte utilise deja cette adresse email');
    }
    await this.verifierRoles(hopitalId, dto.roleIds);

    const cree = await this.prisma.utilisateur.create({
      data: {
        hopitalId,
        email: dto.email,
        motDePasse: await bcrypt.hash(dto.motDePasse, 10),
        nom: dto.nom,
        prenom: dto.prenom,
        telephone: dto.telephone,
        roles: { create: dto.roleIds.map((roleId) => ({ roleId })) },
      },
      select: VUE,
    });
    return this.presenter(cree);
  }

  async update(
    hopitalId: string,
    id: string,
    utilisateurCourantId: string,
    dto: UpdateUtilisateurDto,
  ) {
    await this.trouver(hopitalId, id);

    // Garde-fou : ne pas se desactiver ni se retirer ses propres droits
    if (id === utilisateurCourantId) {
      if (dto.actif === false) {
        throw new BadRequestException(
          'Vous ne pouvez pas desactiver votre propre compte',
        );
      }
      if (dto.roleIds) {
        throw new BadRequestException(
          'Vous ne pouvez pas modifier vos propres roles',
        );
      }
    }

    if (dto.roleIds) {
      await this.verifierRoles(hopitalId, dto.roleIds);
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.roleIds) {
        await tx.utilisateurRole.deleteMany({ where: { utilisateurId: id } });
        await tx.utilisateurRole.createMany({
          data: dto.roleIds.map((roleId) => ({ utilisateurId: id, roleId })),
        });
      }
      const maj = await tx.utilisateur.update({
        where: { id },
        data: {
          nom: dto.nom,
          prenom: dto.prenom,
          telephone: dto.telephone,
          actif: dto.actif,
        },
        select: VUE,
      });
      return this.presenter(maj);
    });
  }

  // Reinitialisation par un administrateur
  async reinitialiserMotDePasse(
    hopitalId: string,
    id: string,
    dto: ReinitialiserMotDePasseDto,
  ) {
    await this.trouver(hopitalId, id);
    await this.prisma.utilisateur.update({
      where: { id },
      data: { motDePasse: await bcrypt.hash(dto.motDePasse, 10) },
    });
    return { message: 'Mot de passe reinitialise' };
  }

  // Changement par l utilisateur lui-meme
  async changerMonMotDePasse(
    utilisateurId: string,
    dto: ChangerMotDePasseDto,
  ) {
    const u = await this.prisma.utilisateur.findUnique({
      where: { id: utilisateurId },
    });
    if (!u || u.deletedAt) {
      throw new NotFoundException('Utilisateur introuvable');
    }
    const correct = await bcrypt.compare(dto.ancienMotDePasse, u.motDePasse);
    if (!correct) {
      throw new UnauthorizedException('Mot de passe actuel incorrect');
    }
    if (dto.ancienMotDePasse === dto.nouveauMotDePasse) {
      throw new BadRequestException(
        'Le nouveau mot de passe doit etre different de l ancien',
      );
    }
    await this.prisma.utilisateur.update({
      where: { id: utilisateurId },
      data: { motDePasse: await bcrypt.hash(dto.nouveauMotDePasse, 10) },
    });
    return { message: 'Mot de passe modifie' };
  }
}
