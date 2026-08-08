import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AjustementConsommableDto,
  CreerConsommableDto,
  EntreeConsommableDto,
  SortieConsommableDto,
} from './dto/consommables.dto';

// Peremption signalee quand elle tombe dans les 60 jours
const HORIZON_PEREMPTION_JOURS = 60;

@Injectable()
export class ConsommablesService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Etat du stock : la somme des mouvements, jamais un champ.
  // --------------------------------------------------------------------------
  async etatStock(hopitalId: string) {
    const articles = await this.prisma.consommable.findMany({
      where: { hopitalId, actif: true },
      select: {
        id: true,
        code: true,
        designation: true,
        unite: true,
        seuilAlerte: true,
        prixUnitaire: true,
      },
      orderBy: { designation: 'asc' },
    });

    const sommes = await this.prisma.mouvementConsommable.groupBy({
      by: ['consommableId', 'type'],
      where: { hopitalId },
      _sum: { quantite: true },
    });
    const stockDe = new Map<string, number>();
    for (const s of sommes) {
      const q = s._sum.quantite ?? 0;
      const courant = stockDe.get(s.consommableId) ?? 0;
      const delta = s.type === 'sortie' ? -q : q;
      stockDe.set(s.consommableId, courant + delta);
    }

    const horizon = new Date(
      Date.now() + HORIZON_PEREMPTION_JOURS * 86400000,
    );
    const peremptions = await this.prisma.mouvementConsommable.findMany({
      where: {
        hopitalId,
        type: 'entree',
        datePeremption: { not: null, lte: horizon },
      },
      select: { consommableId: true, datePeremption: true },
      orderBy: { datePeremption: 'asc' },
    });
    const peremptionDe = new Map<string, Date>();
    for (const p of peremptions) {
      if (!peremptionDe.has(p.consommableId) && p.datePeremption) {
        peremptionDe.set(p.consommableId, p.datePeremption);
      }
    }

    return articles.map((a) => {
      const stock = stockDe.get(a.id) ?? 0;
      return {
        id: a.id,
        code: a.code,
        designation: a.designation,
        unite: a.unite,
        seuilAlerte: a.seuilAlerte,
        prixUnitaire:
          a.prixUnitaire !== null ? Number(a.prixUnitaire) : null,
        stock,
        sousSeuil: stock <= a.seuilAlerte,
        peremptionProche: peremptionDe.get(a.id) ?? null,
      };
    });
  }

  // --------------------------------------------------------------------------
  // Journal des mouvements recents
  // --------------------------------------------------------------------------
  mouvements(hopitalId: string, consommableId?: string) {
    return this.prisma.mouvementConsommable.findMany({
      where: { hopitalId, ...(consommableId ? { consommableId } : {}) },
      select: {
        id: true,
        type: true,
        quantite: true,
        datePeremption: true,
        motif: true,
        createdAt: true,
        consommable: { select: { designation: true, unite: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // --------------------------------------------------------------------------
  // Nouveau consommable au catalogue
  // --------------------------------------------------------------------------
  async creer(hopitalId: string, dto: CreerConsommableDto) {
    const existant = await this.prisma.consommable.findFirst({
      where: { hopitalId, designation: dto.designation },
      select: { id: true },
    });
    if (existant) {
      throw new BadRequestException(
        `${dto.designation} existe deja au catalogue`,
      );
    }
    return this.prisma.consommable.create({
      data: {
        hopitalId,
        designation: dto.designation,
        code: dto.code ?? null,
        unite: dto.unite ?? null,
        seuilAlerte: dto.seuilAlerte ?? 10,
        prixUnitaire: dto.prixUnitaire ?? null,
      },
      select: { id: true, designation: true },
    });
  }

  // --------------------------------------------------------------------------
  // Entree (achat, reception)
  // --------------------------------------------------------------------------
  async entree(hopitalId: string, dto: EntreeConsommableDto) {
    await this.verifierConsommable(hopitalId, dto.consommableId);
    return this.prisma.mouvementConsommable.create({
      data: {
        hopitalId,
        consommableId: dto.consommableId,
        type: 'entree',
        quantite: dto.quantite,
        datePeremption: dto.datePeremption
          ? new Date(dto.datePeremption)
          : null,
        prixAchat: dto.prixAchat ?? null,
        motif: dto.motif ?? null,
      },
      select: { id: true, type: true, quantite: true, createdAt: true },
    });
  }

  // --------------------------------------------------------------------------
  // Sortie de consommation : motivee, et jamais plus que le stock
  // --------------------------------------------------------------------------
  async sortie(hopitalId: string, dto: SortieConsommableDto) {
    await this.verifierConsommable(hopitalId, dto.consommableId);

    const etat = await this.etatStock(hopitalId);
    const article = etat.find((a) => a.id === dto.consommableId);
    if (!article) throw new NotFoundException('Consommable introuvable');
    if (article.stock < dto.quantite) {
      throw new BadRequestException(
        `Stock insuffisant pour ${article.designation} : ${article.stock} en stock, ${dto.quantite} demandes`,
      );
    }

    return this.prisma.mouvementConsommable.create({
      data: {
        hopitalId,
        consommableId: dto.consommableId,
        type: 'sortie',
        quantite: dto.quantite,
        motif: dto.motif,
      },
      select: { id: true, type: true, quantite: true, createdAt: true },
    });
  }

  // --------------------------------------------------------------------------
  // Ajustement d'inventaire (motif obligatoire, quantite signee)
  // --------------------------------------------------------------------------
  async ajustement(hopitalId: string, dto: AjustementConsommableDto) {
    if (dto.quantite === 0) {
      throw new BadRequestException('Un ajustement de zero est sans objet');
    }
    await this.verifierConsommable(hopitalId, dto.consommableId);
    return this.prisma.mouvementConsommable.create({
      data: {
        hopitalId,
        consommableId: dto.consommableId,
        type: 'ajustement',
        quantite: dto.quantite,
        motif: dto.motif,
      },
      select: { id: true, type: true, quantite: true, createdAt: true },
    });
  }

  private async verifierConsommable(hopitalId: string, consommableId: string) {
    const c = await this.prisma.consommable.findFirst({
      where: { id: consommableId, hopitalId, actif: true },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Consommable introuvable');
  }
}
