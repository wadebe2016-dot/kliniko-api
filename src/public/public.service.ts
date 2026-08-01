import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisponibilitesService } from '../disponibilites/disponibilites.service';

// =============================================================================
// Surface PUBLIQUE de Kliniko : consultee sans compte, elle traverse les
// cliniques. Regles absolues :
//  - seuls les etablissements et praticiens visiblePublic apparaissent ;
//  - chaque objet renvoye est verifie comme appartenant a la clinique
//    demandee, jamais deduit ;
//  - les champs sont enumeres un a un ; aucune donnee medicale, aucun
//    patient, aucune donnee financiere ne sort par ici.
// =============================================================================

@Injectable()
export class PublicService {
  constructor(
    private prisma: PrismaService,
    private disponibilites: DisponibilitesService,
  ) {}

  // La clinique doit etre active ET volontairement visible
  private async cliniqueVisible(cliniqueId: string) {
    const clinique = await this.prisma.hopital.findFirst({
      where: {
        id: cliniqueId,
        actif: true,
        visiblePublic: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!clinique) throw new NotFoundException('Clinique introuvable');
  }

  listerCliniques(ville?: string) {
    return this.prisma.hopital.findMany({
      where: {
        actif: true,
        visiblePublic: true,
        deletedAt: null,
        ...(ville
          ? { ville: { contains: ville, mode: 'insensitive' as const } }
          : {}),
      },
      select: {
        id: true,
        nom: true,
        ville: true,
        adresse: true,
        telephone: true,
        presentation: true,
      },
      orderBy: [{ ville: 'asc' }, { nom: 'asc' }],
    });
  }

  async listerPraticiens(cliniqueId: string) {
    await this.cliniqueVisible(cliniqueId);
    return this.prisma.praticien.findMany({
      where: {
        hopitalId: cliniqueId,
        visiblePublic: true,
        deletedAt: null,
      },
      select: { id: true, nom: true, prenom: true, specialite: true },
      orderBy: { nom: 'asc' },
    });
  }

  async creneaux(
    cliniqueId: string,
    praticienId: string,
    du: string,
    au: string,
  ) {
    await this.cliniqueVisible(cliniqueId);
    const praticien = await this.prisma.praticien.findFirst({
      where: {
        id: praticienId,
        hopitalId: cliniqueId, // appartenance verifiee, jamais deduite
        visiblePublic: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!praticien) throw new NotFoundException('Praticien introuvable');

    if (!/^\d{4}-\d{2}-\d{2}$/.test(du) || !/^\d{4}-\d{2}-\d{2}$/.test(au)) {
      throw new BadRequestException('Dates attendues au format AAAA-MM-JJ');
    }
    // Le calcul reutilise le moteur interne ; il ne revele que des heures,
    // jamais l'identite des patients qui occupent les creneaux pris.
    return this.disponibilites.calculerCreneaux(
      cliniqueId,
      praticienId,
      du,
      au,
    );
  }
}
