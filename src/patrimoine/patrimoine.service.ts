import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ChangerEtatDto,
  CreerActifDto,
  ModifierActifDto,
} from './patrimoine.dto';

const ETAT_LIBELLE: Record<string, string> = {
  en_service: 'En service',
  en_maintenance: 'En maintenance',
  en_panne: 'En panne',
  reforme: 'Réformé',
};

@Injectable()
export class PatrimoineService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Inventaire
  // --------------------------------------------------------------------------
  async actifs(hopitalId: string) {
    const actifs = await this.prisma.actif.findMany({
      where: { hopitalId },
      orderBy: [{ etat: 'asc' }, { designation: 'asc' }],
    });
    return actifs.map((a) => ({
      ...a,
      valeurAcquisition:
        a.valeurAcquisition !== null ? Number(a.valeurAcquisition) : null,
    }));
  }

  // --------------------------------------------------------------------------
  // Journal des evenements recents
  // --------------------------------------------------------------------------
  evenements(hopitalId: string, actifId?: string) {
    return this.prisma.evenementActif.findMany({
      where: { hopitalId, ...(actifId ? { actifId } : {}) },
      select: {
        id: true,
        type: true,
        detail: true,
        createdAt: true,
        actif: { select: { designation: true, code: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // --------------------------------------------------------------------------
  // Nouvel actif
  // --------------------------------------------------------------------------
  async creer(hopitalId: string, dto: CreerActifDto) {
    if (dto.code) {
      const doublon = await this.prisma.actif.findFirst({
        where: { hopitalId, code: dto.code },
        select: { id: true },
      });
      if (doublon) {
        throw new BadRequestException(`Le code ${dto.code} existe déjà`);
      }
    }
    return this.prisma.$transaction(async (tx) => {
      const actif = await tx.actif.create({
        data: {
          hopitalId,
          designation: dto.designation,
          code: dto.code ?? null,
          categorie: dto.categorie ?? null,
          localisation: dto.localisation ?? null,
          dateAcquisition: dto.dateAcquisition
            ? new Date(dto.dateAcquisition)
            : null,
          valeurAcquisition: dto.valeurAcquisition ?? null,
          notes: dto.notes ?? null,
        },
        select: { id: true, designation: true },
      });
      await tx.evenementActif.create({
        data: {
          hopitalId,
          actifId: actif.id,
          type: 'creation',
          detail: 'Entrée au patrimoine',
        },
      });
      return actif;
    });
  }

  // --------------------------------------------------------------------------
  // Modifier la fiche d'un actif
  // --------------------------------------------------------------------------
  async modifier(hopitalId: string, actifId: string, dto: ModifierActifDto) {
    await this.verifierActif(hopitalId, actifId);
    return this.prisma.actif.update({
      where: { id: actifId },
      data: {
        designation: dto.designation ?? undefined,
        categorie: dto.categorie !== undefined ? dto.categorie || null : undefined,
        localisation:
          dto.localisation !== undefined ? dto.localisation || null : undefined,
        valeurAcquisition:
          dto.valeurAcquisition !== undefined ? dto.valeurAcquisition : undefined,
        notes: dto.notes !== undefined ? dto.notes || null : undefined,
      },
      select: { id: true, designation: true },
    });
  }

  // --------------------------------------------------------------------------
  // Changement d'etat motive, trace au journal
  // --------------------------------------------------------------------------
  async changerEtat(hopitalId: string, actifId: string, dto: ChangerEtatDto) {
    const actif = await this.verifierActif(hopitalId, actifId);
    if (actif.etat === dto.etat) {
      throw new BadRequestException(
        `Cet actif est déjà « ${ETAT_LIBELLE[dto.etat]} »`,
      );
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.actif.update({
        where: { id: actifId },
        data: { etat: dto.etat },
      });
      await tx.evenementActif.create({
        data: {
          hopitalId,
          actifId,
          type: 'etat',
          detail: `${ETAT_LIBELLE[actif.etat]} → ${ETAT_LIBELLE[dto.etat]} : ${dto.motif}`,
        },
      });
      return { id: actifId, etat: dto.etat };
    });
  }

  private async verifierActif(hopitalId: string, actifId: string) {
    const a = await this.prisma.actif.findFirst({
      where: { id: actifId, hopitalId },
      select: { id: true, etat: true },
    });
    if (!a) throw new NotFoundException('Actif introuvable');
    return a;
  }
}
