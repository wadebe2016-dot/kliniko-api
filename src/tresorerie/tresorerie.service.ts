import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreerCategorieDto,
  CreerCompteDto,
  LigneBudgetDto,
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
  // Controle de gestion : lignes de budget d'une annee, realise calcule
  // depuis les mouvements. Les categories consommees sans budget apparaissent
  // avec un prevu de zero.
  // --------------------------------------------------------------------------
  async budget(hopitalId: string, annee: number) {
    const lignes = await this.prisma.ligneBudget.findMany({
      where: { hopitalId, annee },
      include: { categorie: { select: { id: true, nom: true, sens: true } } },
    });

    const debut = new Date(Date.UTC(annee, 0, 1));
    const fin = new Date(Date.UTC(annee, 11, 31, 23, 59, 59));
    const realises = await this.prisma.mouvementTresorerie.groupBy({
      by: ['categorieId'],
      where: {
        hopitalId,
        categorieId: { not: null },
        dateMouvement: { gte: debut, lte: fin },
      },
      _sum: { montant: true },
    });
    const realiseDe = new Map<string, number>();
    for (const r of realises) {
      if (r.categorieId) {
        realiseDe.set(r.categorieId, Number(r._sum.montant ?? 0));
      }
    }

    const sortie = lignes.map((l) => {
      const prevu = Number(l.montantPrevu);
      const realise = realiseDe.get(l.categorieId) ?? 0;
      return {
        id: l.id as string | null,
        categorie: l.categorie,
        prevu,
        realise,
        ecart: prevu - realise,
        consomme: prevu > 0 ? (realise / prevu) * 100 : realise > 0 ? 100 : 0,
      };
    });

    // Categories consommees sans ligne de budget
    const budgetees = new Set(lignes.map((l) => l.categorieId));
    const horsBudget = [...realiseDe.entries()].filter(
      ([id, montant]) => !budgetees.has(id) && montant > 0,
    );
    if (horsBudget.length > 0) {
      const categories = await this.prisma.categorieTresorerie.findMany({
        where: { id: { in: horsBudget.map(([id]) => id) } },
        select: { id: true, nom: true, sens: true },
      });
      for (const c of categories) {
        const realise = realiseDe.get(c.id) ?? 0;
        sortie.push({
          id: null,
          categorie: c,
          prevu: 0,
          realise,
          ecart: -realise,
          consomme: 100,
        });
      }
    }

    const somme = (
      sens: 'recette' | 'depense',
      champ: 'prevu' | 'realise',
    ) =>
      sortie
        .filter((l) => l.categorie.sens === sens)
        .reduce((s, l) => s + l[champ], 0);

    const recettesPrevu = somme('recette', 'prevu');
    const recettesRealise = somme('recette', 'realise');
    const depensesPrevu = somme('depense', 'prevu');
    const depensesRealise = somme('depense', 'realise');

    return {
      annee,
      lignes: sortie.sort((a, b) =>
        a.categorie.sens === b.categorie.sens
          ? a.categorie.nom.localeCompare(b.categorie.nom)
          : a.categorie.sens === 'recette'
            ? -1
            : 1,
      ),
      totaux: {
        recettesPrevu,
        recettesRealise,
        depensesPrevu,
        depensesRealise,
        execution: depensesPrevu > 0 ? (depensesRealise / depensesPrevu) * 100 : 0,
        realisation:
          recettesPrevu > 0 ? (recettesRealise / recettesPrevu) * 100 : 0,
        marge: recettesRealise - depensesRealise,
        depassements: sortie.filter(
          (l) => l.categorie.sens === 'depense' && l.realise > l.prevu,
        ).length,
      },
    };
  }

  async definirLigneBudget(hopitalId: string, dto: LigneBudgetDto) {
    const categorie = await this.prisma.categorieTresorerie.findFirst({
      where: { id: dto.categorieId, hopitalId },
      select: { id: true },
    });
    if (!categorie) throw new NotFoundException('Catégorie introuvable');

    const existante = await this.prisma.ligneBudget.findFirst({
      where: { hopitalId, annee: dto.annee, categorieId: dto.categorieId },
      select: { id: true },
    });
    if (existante) {
      return this.prisma.ligneBudget.update({
        where: { id: existante.id },
        data: { montantPrevu: dto.montantPrevu },
        select: { id: true },
      });
    }
    return this.prisma.ligneBudget.create({
      data: {
        hopitalId,
        annee: dto.annee,
        categorieId: dto.categorieId,
        montantPrevu: dto.montantPrevu,
      },
      select: { id: true },
    });
  }

  async supprimerLigneBudget(hopitalId: string, ligneId: string) {
    const l = await this.prisma.ligneBudget.findFirst({
      where: { id: ligneId, hopitalId },
      select: { id: true },
    });
    if (!l) throw new NotFoundException('Ligne de budget introuvable');
    await this.prisma.ligneBudget.delete({ where: { id: l.id } });
    return { id: l.id };
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
