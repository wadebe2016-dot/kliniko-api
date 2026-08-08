import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreerActeDto,
  ModifierActeDto,
  ModifierPrixMedicamentDto,
  NouveauTarifDto,
} from './tarifs.dto';

// La mercuriale : les prix des actes sont DATES. Un nouveau tarif prend
// effet immediatement et clot le precedent ; l'historique est conserve et
// les factures deja emises ne changent jamais.
@Injectable()
export class TarifsService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Actes avec leur tarif en vigueur
  // --------------------------------------------------------------------------
  async actes(hopitalId: string) {
    const maintenant = new Date();
    const actes = await this.prisma.acte.findMany({
      where: { hopitalId, deletedAt: null },
      orderBy: { code: 'asc' },
      include: {
        tarifs: {
          where: {
            deletedAt: null,
            dateDebut: { lte: maintenant },
            OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }],
          },
          orderBy: { dateDebut: 'desc' },
          take: 1,
        },
      },
    });
    return actes.map((a) => ({
      id: a.id,
      code: a.code,
      libelle: a.libelle,
      tarif: a.tarifs[0] ? Number(a.tarifs[0].montant) : null,
      devise: a.tarifs[0] ? a.tarifs[0].devise : 'XAF',
      depuis: a.tarifs[0] ? a.tarifs[0].dateDebut : null,
    }));
  }

  // --------------------------------------------------------------------------
  // Nouvel acte au catalogue (avec son tarif initial si fourni)
  // --------------------------------------------------------------------------
  async creerActe(hopitalId: string, dto: CreerActeDto) {
    const existant = await this.prisma.acte.findFirst({
      where: { hopitalId, code: dto.code, deletedAt: null },
      select: { id: true },
    });
    if (existant) {
      throw new BadRequestException(`L'acte ${dto.code} existe déjà`);
    }
    return this.prisma.$transaction(async (tx) => {
      const acte = await tx.acte.create({
        data: { hopitalId, code: dto.code, libelle: dto.libelle },
        select: { id: true, code: true, libelle: true },
      });
      if (dto.montant !== undefined) {
        await tx.tarif.create({
          data: {
            hopitalId,
            acteId: acte.id,
            montant: dto.montant,
            devise: 'XAF',
            dateDebut: new Date(),
          },
        });
      }
      return acte;
    });
  }

  // --------------------------------------------------------------------------
  // Renommer un acte (le code, lui, ne change pas)
  // --------------------------------------------------------------------------
  async modifierActe(hopitalId: string, acteId: string, dto: ModifierActeDto) {
    await this.verifierActe(hopitalId, acteId);
    return this.prisma.acte.update({
      where: { id: acteId },
      data: { libelle: dto.libelle },
      select: { id: true, code: true, libelle: true },
    });
  }

  // --------------------------------------------------------------------------
  // Nouveau tarif : clot le tarif courant et ouvre le nouveau, date du jour.
  // --------------------------------------------------------------------------
  async nouveauTarif(hopitalId: string, acteId: string, dto: NouveauTarifDto) {
    await this.verifierActe(hopitalId, acteId);
    const maintenant = new Date();
    return this.prisma.$transaction(async (tx) => {
      await tx.tarif.updateMany({
        where: { hopitalId, acteId, deletedAt: null, dateFin: null },
        data: { dateFin: maintenant },
      });
      await tx.tarif.create({
        data: {
          hopitalId,
          acteId,
          montant: dto.montant,
          devise: 'XAF',
          dateDebut: maintenant,
        },
      });
      return { id: acteId, tarif: dto.montant };
    });
  }

  // --------------------------------------------------------------------------
  // Prix de vente des medicaments
  // --------------------------------------------------------------------------
  async medicaments(hopitalId: string) {
    const meds = await this.prisma.medicament.findMany({
      where: { hopitalId, deletedAt: null, actif: true },
      select: {
        id: true,
        code: true,
        denomination: true,
        dosage: true,
        forme: true,
        prixVente: true,
      },
      orderBy: { denomination: 'asc' },
    });
    return meds.map((m) => ({
      ...m,
      prixVente: m.prixVente !== null ? Number(m.prixVente) : null,
    }));
  }

  async modifierPrixMedicament(
    hopitalId: string,
    medicamentId: string,
    dto: ModifierPrixMedicamentDto,
  ) {
    const m = await this.prisma.medicament.findFirst({
      where: { id: medicamentId, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!m) throw new NotFoundException('Médicament introuvable');
    return this.prisma.medicament.update({
      where: { id: medicamentId },
      data: { prixVente: dto.prixVente },
      select: { id: true, denomination: true, prixVente: true },
    });
  }

  private async verifierActe(hopitalId: string, acteId: string) {
    const a = await this.prisma.acte.findFirst({
      where: { id: acteId, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!a) throw new NotFoundException('Acte introuvable');
  }
}
