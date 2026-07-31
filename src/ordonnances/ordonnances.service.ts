import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreerOrdonnanceDto,
  LigneOrdonnanceDto,
} from './dto/creer-ordonnance.dto';
import { ModifierOrdonnanceDto } from './dto/modifier-ordonnance.dto';

// Ce que l'API renvoie d'une ordonnance. L'en-tete de la clinique est inclus :
// c'est ce qui permet d'imprimer sans un second appel.
const VUE = {
  id: true,
  numero: true,
  dateOrdonnance: true,
  statut: true,
  notes: true,
  valideeLe: true,
  annuleeLe: true,
  motifAnnulation: true,
  consultationId: true,
  hopital: { select: { nom: true, ville: true, telephone: true } },
  patient: {
    select: {
      id: true,
      numeroDossier: true,
      nom: true,
      prenom: true,
      dateNaissance: true,
      sexe: true,
    },
  },
  praticien: {
    select: { id: true, nom: true, prenom: true, specialite: true },
  },
  lignes: {
    select: {
      id: true,
      medicamentId: true,
      libelle: true,
      posologie: true,
      duree: true,
      quantite: true,
      voie: true,
      instructions: true,
      ordre: true,
    },
    orderBy: { ordre: 'asc' } as const,
  },
};

@Injectable()
export class OrdonnancesService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Referentiel medicaments
  // --------------------------------------------------------------------------
  listerMedicaments(hopitalId: string) {
    return this.prisma.medicament.findMany({
      where: { hopitalId, actif: true, deletedAt: null },
      select: {
        id: true,
        code: true,
        denomination: true,
        forme: true,
        dosage: true,
      },
      orderBy: { denomination: 'asc' },
    });
  }

  // --------------------------------------------------------------------------
  // Lecture
  // --------------------------------------------------------------------------
  lister(
    hopitalId: string,
    filtres: { patientId?: string; consultationId?: string },
  ) {
    return this.prisma.ordonnance.findMany({
      where: {
        hopitalId,
        deletedAt: null,
        ...(filtres.patientId ? { patientId: filtres.patientId } : {}),
        ...(filtres.consultationId
          ? { consultationId: filtres.consultationId }
          : {}),
      },
      select: VUE,
      orderBy: { dateOrdonnance: 'desc' },
    });
  }

  async trouver(hopitalId: string, id: string) {
    const ordonnance = await this.prisma.ordonnance.findFirst({
      where: { id, hopitalId, deletedAt: null },
      select: VUE,
    });
    if (!ordonnance) throw new NotFoundException('Ordonnance introuvable');
    return ordonnance;
  }

  // --------------------------------------------------------------------------
  // Redaction
  // --------------------------------------------------------------------------
  async creer(
    hopitalId: string,
    utilisateurId: string,
    dto: CreerOrdonnanceDto,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) throw new NotFoundException('Patient introuvable');

    if (dto.consultationId) {
      const consultation = await this.prisma.consultation.findFirst({
        where: { id: dto.consultationId, hopitalId, deletedAt: null },
        select: { patientId: true },
      });
      if (!consultation) {
        throw new NotFoundException('Consultation introuvable');
      }
      if (consultation.patientId !== dto.patientId) {
        throw new BadRequestException(
          'Cette consultation ne concerne pas ce patient',
        );
      }
    }

    const praticienId = await this.praticienDeLUtilisateur(
      hopitalId,
      utilisateurId,
    );
    const valider = dto.valider === true;

    return this.prisma.$transaction(async (tx) => {
      const numero = await this.genererNumero(tx, hopitalId);
      return tx.ordonnance.create({
        data: {
          hopitalId,
          patientId: dto.patientId,
          praticienId,
          consultationId: dto.consultationId ?? null,
          numero,
          notes: dto.notes ?? null,
          statut: valider ? ('validee' as const) : ('brouillon' as const),
          valideeLe: valider ? new Date() : null,
          lignes: { create: this.construireLignes(hopitalId, dto.lignes) },
        },
        select: VUE,
      });
    });
  }

  async modifier(hopitalId: string, id: string, dto: ModifierOrdonnanceDto) {
    const existante = await this.prisma.ordonnance.findFirst({
      where: { id, hopitalId, deletedAt: null },
      select: { id: true, statut: true },
    });
    if (!existante) throw new NotFoundException('Ordonnance introuvable');
    if (existante.statut !== 'brouillon') {
      throw new BadRequestException(
        'Une ordonnance validee ou annulee ne se modifie plus : annulez-la et redigez-en une nouvelle',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.ligneOrdonnance.deleteMany({ where: { ordonnanceId: id } });
      return tx.ordonnance.update({
        where: { id },
        data: {
          notes: dto.notes ?? null,
          lignes: { create: this.construireLignes(hopitalId, dto.lignes) },
        },
        select: VUE,
      });
    });
  }

  // La validation vaut signature : au-dela, l'ordonnance est figee.
  async valider(hopitalId: string, id: string) {
    const existante = await this.prisma.ordonnance.findFirst({
      where: { id, hopitalId, deletedAt: null },
      select: { id: true, statut: true, _count: { select: { lignes: true } } },
    });
    if (!existante) throw new NotFoundException('Ordonnance introuvable');
    if (existante.statut === 'annulee') {
      throw new BadRequestException('Cette ordonnance a ete annulee');
    }
    if (existante.statut === 'validee') {
      throw new BadRequestException('Cette ordonnance est deja validee');
    }
    if (existante._count.lignes === 0) {
      throw new BadRequestException(
        'Une ordonnance sans aucun medicament ne peut pas etre validee',
      );
    }

    return this.prisma.ordonnance.update({
      where: { id },
      data: { statut: 'validee', valideeLe: new Date() },
      select: VUE,
    });
  }

  // On n'efface jamais une ordonnance : on l'annule, et la trace demeure.
  async annuler(hopitalId: string, id: string, motif?: string) {
    const existante = await this.prisma.ordonnance.findFirst({
      where: { id, hopitalId, deletedAt: null },
      select: { id: true, statut: true },
    });
    if (!existante) throw new NotFoundException('Ordonnance introuvable');
    if (existante.statut === 'annulee') {
      throw new BadRequestException('Cette ordonnance est deja annulee');
    }

    return this.prisma.ordonnance.update({
      where: { id },
      data: {
        statut: 'annulee',
        annuleeLe: new Date(),
        motifAnnulation: motif ?? null,
      },
      select: VUE,
    });
  }

  // --------------------------------------------------------------------------
  // Outils internes
  // --------------------------------------------------------------------------
  private construireLignes(hopitalId: string, lignes: LigneOrdonnanceDto[]) {
    return lignes.map((ligne, index) => ({
      hopitalId,
      medicamentId: ligne.medicamentId ?? null,
      libelle: ligne.libelle,
      posologie: ligne.posologie,
      duree: ligne.duree ?? null,
      quantite: ligne.quantite ?? null,
      voie: ligne.voie ?? null,
      instructions: ligne.instructions ?? null,
      ordre: index,
    }));
  }

  // Numerotation O-AAAA-NNNN, dans la transaction, comme pour les factures.
  private async genererNumero(tx: any, hopitalId: string): Promise<string> {
    const prefixe = 'O-' + new Date().getFullYear() + '-';
    const dernier = await tx.ordonnance.findFirst({
      where: { hopitalId, numero: { startsWith: prefixe } },
      orderBy: { numero: 'desc' },
      select: { numero: true },
    });
    const suivant = dernier
      ? Number(dernier.numero.slice(prefixe.length)) + 1
      : 1;
    return prefixe + String(suivant).padStart(4, '0');
  }

  // Le praticien est deduit du jeton, jamais declare par le client.
  // Si l'utilisateur connecte n'a pas encore de fiche praticien, on la cree :
  // celui qui prescrit est un praticien par definition.
  private async praticienDeLUtilisateur(
    hopitalId: string,
    utilisateurId: string,
  ): Promise<string> {
    const existant = await this.prisma.praticien.findFirst({
      where: { hopitalId, utilisateurId, deletedAt: null },
      select: { id: true },
    });
    if (existant) return existant.id;

    const utilisateur = await this.prisma.utilisateur.findFirst({
      where: { id: utilisateurId, hopitalId },
      select: { nom: true, prenom: true },
    });
    const cree = await this.prisma.praticien.create({
      data: {
        hopitalId,
        utilisateurId,
        nom: utilisateur?.nom ?? 'Praticien',
        prenom: utilisateur?.prenom ?? null,
      },
      select: { id: true },
    });
    return cree.id;
  }
}
