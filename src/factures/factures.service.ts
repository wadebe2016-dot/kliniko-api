import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFactureDto } from './dto/create-facture.dto';
import { EncaisserDto } from './dto/encaisser.dto';

const AVEC_PATIENT = {
  patient: { select: { nom: true, prenom: true, numeroDossier: true } },
};

@Injectable()
export class FacturesService {
  constructor(private readonly prisma: PrismaService) {}

  // Creer une facture : les lignes avec acteId prennent le tarif en vigueur,
  // les lignes libres exigent libelle + prixUnitaire.
  async create(hopitalId: string, dto: CreateFactureDto) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient || patient.deletedAt || patient.hopitalId !== hopitalId) {
      throw new BadRequestException(
        `Patient ${dto.patientId} introuvable dans cette clinique`,
      );
    }

    // Resoudre chaque ligne (libelle, prix, montant)
    const maintenant = new Date();
    const lignes: {
      hopitalId: string;
      acteId?: string;
      libelle: string;
      quantite: number;
      prixUnitaire: number;
      montant: number;
    }[] = [];

    for (const ligne of dto.lignes) {
      const quantite = ligne.quantite ?? 1;

      if (ligne.acteId) {
        const acte = await this.prisma.acte.findUnique({
          where: { id: ligne.acteId },
        });
        if (!acte || acte.deletedAt || acte.hopitalId !== hopitalId) {
          throw new BadRequestException(
            `Acte ${ligne.acteId} introuvable dans cette clinique`,
          );
        }
        // Tarif en vigueur : commence avant aujourd'hui, pas encore termine
        const tarif = await this.prisma.tarif.findFirst({
          where: {
            hopitalId,
            acteId: acte.id,
            deletedAt: null,
            dateDebut: { lte: maintenant },
            OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }],
          },
          orderBy: { dateDebut: 'desc' },
        });
        if (!tarif) {
          throw new BadRequestException(
            `Aucun tarif en vigueur pour l'acte ${acte.code}`,
          );
        }
        const prixUnitaire = Number(tarif.montant);
        lignes.push({
          hopitalId,
          acteId: acte.id,
          libelle: ligne.libelle ?? acte.libelle,
          quantite,
          prixUnitaire,
          montant: quantite * prixUnitaire,
        });
      } else {
        if (!ligne.libelle || ligne.prixUnitaire === undefined) {
          throw new BadRequestException(
            'Une ligne sans acte doit avoir un libelle et un prixUnitaire',
          );
        }
        lignes.push({
          hopitalId,
          libelle: ligne.libelle,
          quantite,
          prixUnitaire: ligne.prixUnitaire,
          montant: quantite * ligne.prixUnitaire,
        });
      }
    }

    const montantTotal = lignes.reduce((somme, l) => somme + l.montant, 0);

    // Numero de facture : F-2026-0001, compte par annee et par clinique
    return this.prisma.$transaction(async (tx) => {
      const annee = new Date().getFullYear();
      const deja = await tx.facture.count({
        where: { hopitalId, numero: { startsWith: `F-${annee}-` } },
      });
      const numero = `F-${annee}-${String(deja + 1).padStart(4, '0')}`;

      return tx.facture.create({
        data: {
          hopitalId,
          patientId: dto.patientId,
          numero,
          montantTotal,
          lignes: { create: lignes },
        },
        include: { ...AVEC_PATIENT, lignes: true },
      });
    });
  }

  // Lister les factures de la clinique
  async findAll(hopitalId: string) {
    return this.prisma.facture.findMany({
      where: { hopitalId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: AVEC_PATIENT,
    });
  }

  // Consulter une facture avec ses lignes et ses paiements
  async findOne(hopitalId: string, id: string) {
    const facture = await this.prisma.facture.findUnique({
      where: { id },
      include: {
        ...AVEC_PATIENT,
        lignes: true,
        paiements: { where: { deletedAt: null } },
      },
    });
    if (!facture || facture.deletedAt || facture.hopitalId !== hopitalId) {
      throw new NotFoundException(`Facture ${id} introuvable`);
    }
    return facture;
  }

  // Encaisser un paiement : met a jour montantPaye et le statut
  async encaisser(hopitalId: string, factureId: string, dto: EncaisserDto) {
    const facture = await this.findOne(hopitalId, factureId);

    if (facture.statut === 'annulee') {
      throw new BadRequestException('Cette facture est annulee');
    }
    if (facture.statut === 'reglee') {
      throw new BadRequestException('Cette facture est deja reglee');
    }

    const total = Number(facture.montantTotal);
    const dejaPaye = Number(facture.montantPaye);
    const reste = total - dejaPaye;
    if (dto.montant > reste) {
      throw new BadRequestException(
        `Le montant (${dto.montant}) depasse le reste a payer (${reste})`,
      );
    }

    const nouveauPaye = dejaPaye + dto.montant;
    const nouveauStatut = nouveauPaye >= total ? 'reglee' : 'partielle';

    return this.prisma.$transaction(async (tx) => {
      await tx.paiement.create({
        data: {
          hopitalId,
          factureId,
          montant: dto.montant,
          moyen: dto.moyen,
          telephonePayeur: dto.telephonePayeur,
        },
      });
      return tx.facture.update({
        where: { id: factureId },
        data: { montantPaye: nouveauPaye, statut: nouveauStatut },
        include: {
          ...AVEC_PATIENT,
          lignes: true,
          paiements: { where: { deletedAt: null } },
        },
      });
    });
  }
}

