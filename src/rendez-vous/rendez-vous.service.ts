import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { UpdateRendezVousDto } from './dto/update-rendez-vous.dto';

// Les informations du patient renvoyees avec chaque rendez-vous (pour l'agenda)
const AVEC_PATIENT = {
  patient: { select: { nom: true, prenom: true, numeroDossier: true } },
};

@Injectable()
export class RendezVousService {
  constructor(private readonly prisma: PrismaService) {}

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

  // Creer un rendez-vous
  async create(hopitalId: string, dto: CreateRendezVousDto) {
    await this.verifierPatient(hopitalId, dto.patientId);
    return this.prisma.rendezVous.create({
      data: {
        hopitalId,
        patientId: dto.patientId,
        praticienId: dto.praticienId,
        serviceId: dto.serviceId,
        debut: new Date(dto.debut),
        fin: dto.fin ? new Date(dto.fin) : undefined,
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
    await this.findOne(hopitalId, id);
    // Si on change de patient, il doit appartenir a la meme clinique
    if (dto.patientId) {
      await this.verifierPatient(hopitalId, dto.patientId);
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
