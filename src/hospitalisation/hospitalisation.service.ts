import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  AdmissionDto,
  AnnulationSejourDto,
  CreerChambreDto,
  SortieDto,
} from './dto/hospitalisation.dto';

@Injectable()
export class HospitalisationService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Chambres et lits, avec occupation. Un lit est occupe s'il porte un
  // sejour en_cours : l'occupation est deduite, jamais entretenue a la main.
  // --------------------------------------------------------------------------
  async chambres(hopitalId: string) {
    const chambres = await this.prisma.chambre.findMany({
      where: { hopitalId },
      select: {
        id: true,
        numero: true,
        categorie: true,
        tarifJournalier: true,
        lits: {
          select: {
            id: true,
            numero: true,
            sejours: {
              where: { statut: 'en_cours' },
              select: {
                id: true,
                dateEntree: true,
                motif: true,
                patient: {
                  select: {
                    nom: true,
                    prenom: true,
                    numeroDossier: true,
                  },
                },
              },
            },
          },
          orderBy: { numero: 'asc' },
        },
      },
      orderBy: { numero: 'asc' },
    });

    return chambres.map((c) => ({
      id: c.id,
      numero: c.numero,
      categorie: c.categorie,
      tarifJournalier:
        c.tarifJournalier !== null ? Number(c.tarifJournalier) : null,
      lits: c.lits.map((l) => ({
        id: l.id,
        numero: l.numero,
        occupe: l.sejours.length > 0,
        sejour: l.sejours[0] ?? null,
      })),
    }));
  }

  // --------------------------------------------------------------------------
  // Sejours : en cours d'abord, puis l'historique recent
  // --------------------------------------------------------------------------
  sejours(hopitalId: string) {
    return this.prisma.hospitalisation.findMany({
      where: { hopitalId },
      select: {
        id: true,
        statut: true,
        motif: true,
        notes: true,
        dateEntree: true,
        dateSortie: true,
        patient: {
          select: { nom: true, prenom: true, numeroDossier: true },
        },
        lit: {
          select: {
            numero: true,
            chambre: { select: { numero: true, categorie: true } },
          },
        },
        praticien: { select: { nom: true, prenom: true } },
        facture: { select: { numero: true, montantTotal: true } },
      },
      orderBy: [{ statut: 'asc' }, { dateEntree: 'desc' }],
      take: 100,
    });
  }

  // --------------------------------------------------------------------------
  // Creer une chambre et ses lits
  // --------------------------------------------------------------------------
  async creerChambre(hopitalId: string, dto: CreerChambreDto) {
    const existante = await this.prisma.chambre.findFirst({
      where: { hopitalId, numero: dto.numero },
      select: { id: true },
    });
    if (existante) {
      throw new BadRequestException(
        `La chambre ${dto.numero} existe deja`,
      );
    }
    return this.prisma.chambre.create({
      data: {
        hopitalId,
        numero: dto.numero,
        categorie: dto.categorie ?? null,
        tarifJournalier: dto.tarifJournalier ?? null,
        lits: {
          create: Array.from({ length: dto.nbLits }, (_, i) => ({
            numero: String(i + 1),
          })),
        },
      },
      select: { id: true, numero: true },
    });
  }

  // --------------------------------------------------------------------------
  // Admission : un patient libre, un lit libre
  // --------------------------------------------------------------------------
  async admettre(hopitalId: string, dto: AdmissionDto) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, hopitalId, deletedAt: null },
      select: { id: true, nom: true, prenom: true },
    });
    if (!patient) throw new NotFoundException('Patient introuvable');

    const lit = await this.prisma.lit.findFirst({
      where: { id: dto.litId, chambre: { hopitalId } },
      select: { id: true, numero: true, chambre: { select: { numero: true } } },
    });
    if (!lit) throw new NotFoundException('Lit introuvable');

    const litOccupe = await this.prisma.hospitalisation.count({
      where: { litId: dto.litId, statut: 'en_cours' },
    });
    if (litOccupe > 0) {
      throw new BadRequestException(
        `Le lit ${lit.numero} de la chambre ${lit.chambre.numero} est deja occupe`,
      );
    }

    const dejaHospitalise = await this.prisma.hospitalisation.count({
      where: { hopitalId, patientId: dto.patientId, statut: 'en_cours' },
    });
    if (dejaHospitalise > 0) {
      throw new BadRequestException(
        `${patient.nom} ${patient.prenom ?? ''} a deja un sejour en cours`.trim(),
      );
    }

    return this.prisma.hospitalisation.create({
      data: {
        hopitalId,
        patientId: dto.patientId,
        litId: dto.litId,
        praticienId: dto.praticienId ?? null,
        motif: dto.motif,
        notes: dto.notes ?? null,
      },
      select: { id: true, dateEntree: true },
    });
  }

  // --------------------------------------------------------------------------
  // Sortie : clore le sejour, facturer jours x tarif si demande.
  // Tout ou rien, dans une transaction.
  // --------------------------------------------------------------------------
  async sortie(hopitalId: string, dto: SortieDto) {
    const sejour = await this.prisma.hospitalisation.findFirst({
      where: { id: dto.hospitalisationId, hopitalId },
      select: {
        id: true,
        statut: true,
        dateEntree: true,
        patientId: true,
        lit: {
          select: {
            numero: true,
            chambre: {
              select: { numero: true, tarifJournalier: true },
            },
          },
        },
      },
    });
    if (!sejour) throw new NotFoundException('Sejour introuvable');
    if (sejour.statut !== 'en_cours') {
      throw new BadRequestException('Ce sejour est deja clos');
    }

    const dateSortie = new Date();
    const jours = Math.max(
      1,
      Math.ceil(
        (dateSortie.getTime() - sejour.dateEntree.getTime()) / 86400000,
      ),
    );

    const tarif =
      sejour.lit.chambre.tarifJournalier !== null
        ? Number(sejour.lit.chambre.tarifJournalier)
        : null;
    if (dto.facturer && tarif === null) {
      throw new BadRequestException(
        `La chambre ${sejour.lit.chambre.numero} n'a pas de tarif journalier : renseignez-le avant de facturer`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      let factureId: string | null = null;
      let numeroFacture: string | null = null;
      let montantTotal = 0;

      if (dto.facturer && tarif !== null) {
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
        montantTotal = jours * tarif;

        const facture = await tx.facture.create({
          data: {
            hopitalId,
            patientId: sejour.patientId,
            numero: numeroFacture,
            montantTotal,
            statut: 'ouverte',
            lignes: {
              create: [
                {
                  hopitalId,
                  libelle: `Hospitalisation chambre ${sejour.lit.chambre.numero}, lit ${sejour.lit.numero} (${jours} jour${jours > 1 ? 's' : ''})`,
                  quantite: jours,
                  prixUnitaire: tarif,
                  montant: montantTotal,
                },
              ],
            },
          },
          select: { id: true },
        });
        factureId = facture.id;
      }

      await tx.hospitalisation.update({
        where: { id: sejour.id },
        data: { statut: 'terminee', dateSortie, factureId },
      });

      return {
        jours,
        facture: numeroFacture
          ? { id: factureId, numero: numeroFacture, montantTotal }
          : null,
      };
    });
  }

  // --------------------------------------------------------------------------
  // Annulation : une admission par erreur, jamais facturee
  // --------------------------------------------------------------------------
  async annuler(hopitalId: string, dto: AnnulationSejourDto) {
    const sejour = await this.prisma.hospitalisation.findFirst({
      where: { id: dto.hospitalisationId, hopitalId },
      select: { id: true, statut: true, notes: true },
    });
    if (!sejour) throw new NotFoundException('Sejour introuvable');
    if (sejour.statut !== 'en_cours') {
      throw new BadRequestException('Ce sejour est deja clos');
    }
    return this.prisma.hospitalisation.update({
      where: { id: sejour.id },
      data: {
        statut: 'annulee',
        dateSortie: new Date(),
        notes: [sejour.notes, `Annulation : ${dto.motif}`]
          .filter(Boolean)
          .join(' — '),
      },
      select: { id: true, statut: true },
    });
  }
}
