import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreerCategorieDto,
  CreerCompteDto,
  MouvementDto,
  TransfertDto,
} from './tresorerie.dto';

@Injectable()
export class TresorerieService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Comptes avec leur solde : la somme des mouvements, jamais un champ.
  // recette + transfert recu = credit ; depense + transfert emis = debit.
  // --------------------------------------------------------------------------
  async comptes(hopitalId: string) {
    const comptes = await this.prisma.compteTresorerie.findMany({
      where: { hopitalId, actif: true },
      orderBy: { createdAt: 'asc' },
    });

    const mouvements = await this.prisma.mouvementTresorerie.groupBy({
      by: ['compteId', 'type'],
      where: { hopitalId },
      _sum: { montant: true },
    });
    const recus = await this.prisma.mouvementTresorerie.groupBy({
      by: ['compteDestId'],
      where: { hopitalId, type: 'transfert', compteDestId: { not: null } },
      _sum: { montant: true },
    });

    const soldeDe = new Map<string, number>();
    for (const m of mouvements) {
      const somme = Number(m._sum.montant ?? 0);
      const delta = m.type === 'recette' ? somme : -somme;
      soldeDe.set(m.compteId, (soldeDe.get(m.compteId) ?? 0) + delta);
    }
    for (const r of recus) {
      if (!r.compteDestId) continue;
      soldeDe.set(
        r.compteDestId,
        (soldeDe.get(r.compteDestId) ?? 0) + Number(r._sum.montant ?? 0),
      );
    }

    return comptes.map((c) => ({
      id: c.id,
      nom: c.nom,
      type: c.type,
      solde: soldeDe.get(c.id) ?? 0,
    }));
  }

  async creerCompte(hopitalId: string, dto: CreerCompteDto) {
    const doublon = await this.prisma.compteTresorerie.findFirst({
      where: { hopitalId, nom: dto.nom },
      select: { id: true },
    });
    if (doublon) {
      throw new BadRequestException(`Le compte ${dto.nom} existe déjà`);
    }
    return this.prisma.compteTresorerie.create({
      data: { hopitalId, nom: dto.nom, type: dto.type },
      select: { id: true, nom: true },
    });
  }

  // --------------------------------------------------------------------------
  // Categories
  // --------------------------------------------------------------------------
  categories(hopitalId: string) {
    return this.prisma.categorieTresorerie.findMany({
      where: { hopitalId },
      orderBy: [{ sens: 'asc' }, { nom: 'asc' }],
    });
  }

  async creerCategorie(hopitalId: string, dto: CreerCategorieDto) {
    const doublon = await this.prisma.categorieTresorerie.findFirst({
      where: { hopitalId, nom: dto.nom },
      select: { id: true },
    });
    if (doublon) {
      throw new BadRequestException(`La catégorie ${dto.nom} existe déjà`);
    }
    return this.prisma.categorieTresorerie.create({
      data: { hopitalId, nom: dto.nom, sens: dto.sens },
      select: { id: true, nom: true },
    });
  }

  // --------------------------------------------------------------------------
  // Mouvements d'une periode
  // --------------------------------------------------------------------------
  mouvements(hopitalId: string, du?: string, au?: string) {
    return this.prisma.mouvementTresorerie.findMany({
      where: {
        hopitalId,
        ...(du || au
          ? {
              dateMouvement: {
                ...(du ? { gte: new Date(du) } : {}),
                ...(au ? { lte: new Date(au) } : {}),
              },
            }
          : {}),
      },
      select: {
        id: true,
        type: true,
        libelle: true,
        beneficiaire: true,
        montant: true,
        dateMouvement: true,
        factureId: true,
        compte: { select: { nom: true } },
        compteDest: { select: { nom: true } },
        categorie: { select: { nom: true } },
      },
      orderBy: [{ dateMouvement: 'desc' }, { createdAt: 'desc' }],
      take: 300,
    });
  }

  // --------------------------------------------------------------------------
  // Recette / depense
  // --------------------------------------------------------------------------
  async recette(hopitalId: string, dto: MouvementDto) {
    return this.enregistrer(hopitalId, 'recette', dto);
  }

  async depense(hopitalId: string, dto: MouvementDto) {
    return this.enregistrer(hopitalId, 'depense', dto);
  }

  private async enregistrer(
    hopitalId: string,
    type: 'recette' | 'depense',
    dto: MouvementDto,
  ) {
    await this.verifierCompte(hopitalId, dto.compteId);
    if (dto.categorieId) {
      const c = await this.prisma.categorieTresorerie.findFirst({
        where: { id: dto.categorieId, hopitalId },
        select: { sens: true },
      });
      if (!c) throw new NotFoundException('Catégorie introuvable');
      if (c.sens !== type) {
        throw new BadRequestException(
          `Cette catégorie est une catégorie de ${c.sens}`,
        );
      }
    }
    return this.prisma.mouvementTresorerie.create({
      data: {
        hopitalId,
        type,
        compteId: dto.compteId,
        categorieId: dto.categorieId ?? null,
        libelle: dto.libelle,
        beneficiaire: dto.beneficiaire ?? null,
        montant: dto.montant,
        dateMouvement: dto.date ? new Date(dto.date) : new Date(),
      },
      select: { id: true, type: true, montant: true },
    });
  }

  // --------------------------------------------------------------------------
  // Transfert entre comptes : une seule ecriture, debitant la source et
  // creditant la destination (via compteDestId).
  // --------------------------------------------------------------------------
  async transfert(hopitalId: string, dto: TransfertDto) {
    if (dto.compteId === dto.compteDestId) {
      throw new BadRequestException(
        'La source et la destination doivent différer',
      );
    }
    await this.verifierCompte(hopitalId, dto.compteId);
    await this.verifierCompte(hopitalId, dto.compteDestId);
    return this.prisma.mouvementTresorerie.create({
      data: {
        hopitalId,
        type: 'transfert',
        compteId: dto.compteId,
        compteDestId: dto.compteDestId,
        libelle: dto.libelle ?? 'Transfert entre comptes',
        montant: dto.montant,
        dateMouvement: dto.date ? new Date(dto.date) : new Date(),
      },
      select: { id: true, type: true, montant: true },
    });
  }

  // --------------------------------------------------------------------------
  // Suppression : jamais un mouvement issu d'un encaissement de facture.
  // --------------------------------------------------------------------------
  async supprimer(hopitalId: string, mouvementId: string) {
    const m = await this.prisma.mouvementTresorerie.findFirst({
      where: { id: mouvementId, hopitalId },
      select: { id: true, factureId: true },
    });
    if (!m) throw new NotFoundException('Mouvement introuvable');
    if (m.factureId) {
      throw new BadRequestException(
        "Ce mouvement provient d'un encaissement de facture : il ne peut pas être supprimé",
      );
    }
    await this.prisma.mouvementTresorerie.delete({ where: { id: m.id } });
    return { id: m.id };
  }

  private async verifierCompte(hopitalId: string, compteId: string) {
    const c = await this.prisma.compteTresorerie.findFirst({
      where: { id: compteId, hopitalId, actif: true },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Compte introuvable');
  }
}
