import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AjustementStockDto,
  DispensationDto,
  EntreeStockDto,
} from './dto/pharmacie.dto';

// Peremption signalee quand elle tombe dans les 60 jours
const HORIZON_PEREMPTION_JOURS = 60;

@Injectable()
export class PharmacieService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Etat du stock : le stock est la SOMME des mouvements, jamais un champ.
  // --------------------------------------------------------------------------
  async etatStock(hopitalId: string) {
    const medicaments = await this.prisma.medicament.findMany({
      where: { hopitalId, deletedAt: null, actif: true },
      select: {
        id: true,
        code: true,
        denomination: true,
        forme: true,
        dosage: true,
        prixVente: true,
        seuilAlerte: true,
      },
      orderBy: { denomination: 'asc' },
    });

    const sommes = await this.prisma.mouvementStock.groupBy({
      by: ['medicamentId', 'type'],
      where: { hopitalId },
      _sum: { quantite: true },
    });
    const stockDe = new Map<string, number>();
    for (const s of sommes) {
      const q = s._sum.quantite ?? 0;
      const courant = stockDe.get(s.medicamentId) ?? 0;
      // entree ajoute, sortie retire, ajustement est deja signe
      const delta = s.type === 'sortie' ? -q : q;
      stockDe.set(s.medicamentId, courant + delta);
    }

    const horizon = new Date(
      Date.now() + HORIZON_PEREMPTION_JOURS * 86400000,
    );
    const peremptions = await this.prisma.mouvementStock.findMany({
      where: {
        hopitalId,
        type: 'entree',
        datePeremption: { not: null, lte: horizon },
      },
      select: { medicamentId: true, datePeremption: true },
      orderBy: { datePeremption: 'asc' },
    });
    const peremptionDe = new Map<string, Date>();
    for (const p of peremptions) {
      if (!peremptionDe.has(p.medicamentId) && p.datePeremption) {
        peremptionDe.set(p.medicamentId, p.datePeremption);
      }
    }

    return medicaments.map((m) => {
      const stock = stockDe.get(m.id) ?? 0;
      return {
        id: m.id,
        code: m.code,
        denomination: m.denomination,
        forme: m.forme,
        dosage: m.dosage,
        prixVente: m.prixVente !== null ? Number(m.prixVente) : null,
        seuilAlerte: m.seuilAlerte,
        stock,
        sousSeuil: stock <= m.seuilAlerte,
        peremptionProche: peremptionDe.get(m.id) ?? null,
      };
    });
  }

  // --------------------------------------------------------------------------
  // Mouvements recents (journal du stock)
  // --------------------------------------------------------------------------
  mouvements(hopitalId: string, medicamentId?: string) {
    return this.prisma.mouvementStock.findMany({
      where: { hopitalId, ...(medicamentId ? { medicamentId } : {}) },
      select: {
        id: true,
        type: true,
        quantite: true,
        datePeremption: true,
        motif: true,
        createdAt: true,
        medicament: { select: { denomination: true, dosage: true } },
        ordonnance: { select: { numero: true } },
        facture: { select: { numero: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  // --------------------------------------------------------------------------
  // Entree de stock (achat, reception)
  // --------------------------------------------------------------------------
  async entree(hopitalId: string, dto: EntreeStockDto) {
    await this.verifierMedicament(hopitalId, dto.medicamentId);
    return this.prisma.mouvementStock.create({
      data: {
        hopitalId,
        medicamentId: dto.medicamentId,
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
  // Ajustement d'inventaire (motif obligatoire, quantite signee)
  // --------------------------------------------------------------------------
  async ajustement(hopitalId: string, dto: AjustementStockDto) {
    if (dto.quantite === 0) {
      throw new BadRequestException('Un ajustement de zero est sans objet');
    }
    await this.verifierMedicament(hopitalId, dto.medicamentId);
    return this.prisma.mouvementStock.create({
      data: {
        hopitalId,
        medicamentId: dto.medicamentId,
        type: 'ajustement',
        quantite: dto.quantite,
        motif: dto.motif,
      },
      select: { id: true, type: true, quantite: true, createdAt: true },
    });
  }

  // --------------------------------------------------------------------------
  // Dispensation : delivrer une ordonnance validee, decrementer le stock,
  // et facturer si demande. Tout ou rien, dans une transaction.
  // --------------------------------------------------------------------------
  async dispenser(hopitalId: string, dto: DispensationDto) {
    const ordonnance = await this.prisma.ordonnance.findFirst({
      where: { id: dto.ordonnanceId, hopitalId, deletedAt: null },
      select: { id: true, numero: true, statut: true, patientId: true },
    });
    if (!ordonnance) throw new NotFoundException('Ordonnance introuvable');
    if (ordonnance.statut !== 'validee') {
      throw new BadRequestException(
        'Seule une ordonnance validee peut etre dispensee',
      );
    }

    const dejaDispensee = await this.prisma.mouvementStock.count({
      where: { hopitalId, ordonnanceId: ordonnance.id, type: 'sortie' },
    });
    if (dejaDispensee > 0) {
      throw new BadRequestException(
        `L'ordonnance ${ordonnance.numero} a deja ete dispensee`,
      );
    }

    // Verifier chaque medicament et la suffisance du stock AVANT d'ecrire
    const etat = await this.etatStock(hopitalId);
    const parId = new Map(etat.map((m) => [m.id, m]));
    for (const ligne of dto.lignes) {
      const m = parId.get(ligne.medicamentId);
      if (!m) throw new NotFoundException('Medicament introuvable');
      if (m.stock < ligne.quantite) {
        throw new BadRequestException(
          `Stock insuffisant pour ${m.denomination} : ${m.stock} en stock, ${ligne.quantite} demandes`,
        );
      }
      if (dto.facturer && m.prixVente === null) {
        throw new BadRequestException(
          `${m.denomination} n'a pas de prix de vente : renseignez-le avant de facturer`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      let factureId: string | null = null;
      let numeroFacture: string | null = null;
      let montantTotal = 0;

      if (dto.facturer) {
        const prefixe = 'F-' + new Date().getFullYear() + '-';
        const derniere = await tx.facture.findFirst({
          where: { hopitalId, numero: { startsWith: prefixe } },
          orderBy: { numero: 'desc' },
          select: { numero: true },
        });
        const suivant = derniere
          ? Number(derniere.numero.slice(prefixe.length)) + 1
          : 1;
        numeroFacture = prefixe + String(suivant).padStart(4, '0');

        const lignesFacture = dto.lignes.map((ligne) => {
          const m = parId.get(ligne.medicamentId)!;
          const prix = m.prixVente as number;
          const montant = prix * ligne.quantite;
          montantTotal += montant;
          return {
            hopitalId,
            libelle: [m.denomination, m.dosage, m.forme]
              .filter(Boolean)
              .join(' '),
            quantite: ligne.quantite,
            prixUnitaire: prix,
            montant,
          };
        });

        const facture = await tx.facture.create({
          data: {
            hopitalId,
            patientId: ordonnance.patientId,
            numero: numeroFacture,
            montantTotal,
            statut: 'ouverte',
            lignes: { create: lignesFacture },
          },
          select: { id: true },
        });
        factureId = facture.id;
      }

      for (const ligne of dto.lignes) {
        await tx.mouvementStock.create({
          data: {
            hopitalId,
            medicamentId: ligne.medicamentId,
            type: 'sortie',
            quantite: ligne.quantite,
            ordonnanceId: ordonnance.id,
            factureId,
            motif: `Dispensation ${ordonnance.numero}`,
          },
        });
      }

      return {
        ordonnance: ordonnance.numero,
        lignesDispensees: dto.lignes.length,
        facture: numeroFacture
          ? { id: factureId, numero: numeroFacture, montantTotal }
          : null,
      };
    });
  }

  private async verifierMedicament(hopitalId: string, medicamentId: string) {
    const m = await this.prisma.medicament.findFirst({
      where: { id: medicamentId, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!m) throw new NotFoundException('Medicament introuvable');
  }
}
