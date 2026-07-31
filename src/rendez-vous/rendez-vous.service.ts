import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisponibilitesService } from '../disponibilites/disponibilites.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { UpdateRendezVousDto } from './dto/update-rendez-vous.dto';

// Les informations du patient renvoyees avec chaque rendez-vous (pour l'agenda)
const AVEC_PATIENT = {
  patient: { select: { nom: true, prenom: true, numeroDossier: true } },
};

// Statuts pour lesquels le creneau est reellement occupe
const STATUTS_VIVANTS = ['planifie', 'confirme', 'honore'];

@Injectable()
export class RendezVousService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disponibilites: DisponibilitesService,
  ) {}

  // Verifie qu'un patient existe et appartient bien a la clinique
  private async verifierPatient(hopitalId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient || patient.deletedAt || patient.hopitalId !== hopitalId) {
      throw new BadRequestException(
        `Patient ${patientId} introuvable dans cette clinique`,
      );
    }
  }

  // Refuse le creneau s'il chevauche un rendez-vous vivant ou une
  // indisponibilite du praticien (ou de la clinique entiere).
  private async refuserSiConflit(
    hopitalId: string,
    praticienId: string | null | undefined,
    debut: Date,
    fin: Date | null,
    rendezVousIgnore?: string,
  ) {
    if (!praticienId) return; // sans praticien designe, pas d'agenda a proteger
    const conflit = await this.disponibilites.verifierConflit(
      hopitalId,
      praticienId,
      debut,
      fin,
      rendezVousIgnore,
    );
    if (conflit) throw new BadRequestException(conflit);
  }

  // Creer un rendez-vous
  async create(hopitalId: string, dto: CreateRendezVousDto) {
    await this.verifierPatient(hopitalId, dto.patientId);
    const debut = new Date(dto.debut);
    const fin = dto.fin ? new Date(dto.fin) : null;
    await this.refuserSiConflit(hopitalId, dto.praticienId, debut, fin);
    return this.prisma.rendezVous.create({
      data: {
        hopitalId,
        patientId: dto.patientId,
        praticienId: dto.praticienId,
        serviceId: dto.serviceId,
        debut,
        fin: fin ?? undefined,
        motif: dto.motif,
        origine: dto.origine,
      },
      include: AVEC_PATIENT,
    });
  }

  // Lister les rendez-vous de la clinique, avec periode optionnelle
  // (?du=2026-08-03&au=2026-08-09 pour une semaine d'agenda)
  async findAll(hopitalId: string, du?: string, au?: string) {
    return this.prisma.rendezVous.findMany({
      where: {
        hopitalId,
        deletedAt: null,
        ...(du || au
          ? {
              debut: {
                ...(du ? { gte: new Date(du) } : {}),
                ...(au ? { lte: new Date(au) } : {}),
              },
            }
          : {}),
      },
      orderBy: { debut: 'asc' },
      include: AVEC_PATIENT,
    });
  }

  // Consulter un rendez-vous (refuse ceux des autres cliniques)
  async findOne(hopitalId: string, id: string) {
    const rdv = await this.prisma.rendezVous.findUnique({
      where: { id },
      include: AVEC_PATIENT,
    });
    if (!rdv || rdv.deletedAt || rdv.hopitalId !== hopitalId) {
      throw new NotFoundException(`Rendez-vous ${id} introuvable`);
    }
    return rdv;
  }

  // Modifier un rendez-vous (dates, motif, statut, praticien...)
  async update(hopitalId: string, id: string, dto: UpdateRendezVousDto) {
    const existant = await this.findOne(hopitalId, id);
    // Si on change de patient, il doit appartenir a la meme clinique
    if (dto.patientId) {
      await this.verifierPatient(hopitalId, dto.patientId);
    }

    // L'etat final du rendez-vous apres modification
    const statutFinal = dto.statut ?? existant.statut;
    const praticienFinal = dto.praticienId ?? existant.praticienId;
    const debutFinal = dto.debut ? new Date(dto.debut) : existant.debut;
    const finFinal = dto.fin ? new Date(dto.fin) : existant.fin;

    // On ne verifie que si le rendez-vous occupera reellement un creneau
    if (STATUTS_VIVANTS.includes(statutFinal)) {
      await this.refuserSiConflit(
        hopitalId,
        praticienFinal,
        debutFinal,
        finFinal,
        id,
      );
    }

    return this.prisma.rendezVous.update({
      where: { id },
      data: {
        ...dto,
        debut: dto.debut ? new Date(dto.debut) : undefined,
        fin: dto.fin ? new Date(dto.fin) : undefined,
      },
      include: AVEC_PATIENT,
    });
  }

  // Annulation : changement de statut, on ne supprime jamais
  async annuler(hopitalId: string, id: string) {
    await this.findOne(hopitalId, id);
    return this.prisma.rendezVous.update({
      where: { id },
      data: { statut: 'annule' },
      include: AVEC_PATIENT,
    });
  }
}
