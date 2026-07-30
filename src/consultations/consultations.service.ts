import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';

const INCLUSIONS = {
  patient: { select: { nom: true, prenom: true, numeroDossier: true } },
  praticien: { select: { nom: true, prenom: true, specialite: true } },
  rendezVous: { select: { debut: true, statut: true } },
};

@Injectable()
export class ConsultationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Creer une consultation. Si elle est liee a un rendez-vous,
  // celui-ci passe automatiquement au statut "honore".
  async create(
    hopitalId: string,
    utilisateurId: string,
    dto: CreateConsultationDto,
  ) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: dto.patientId },
    });
    if (!patient || patient.deletedAt || patient.hopitalId !== hopitalId) {
      throw new BadRequestException(
        `Patient ${dto.patientId} introuvable dans cette clinique`,
      );
    }

    if (dto.rendezVousId) {
      const rdv = await this.prisma.rendezVous.findUnique({
        where: { id: dto.rendezVousId },
      });
      if (!rdv || rdv.deletedAt || rdv.hopitalId !== hopitalId) {
        throw new BadRequestException(
          `Rendez-vous ${dto.rendezVousId} introuvable dans cette clinique`,
        );
      }
      if (rdv.patientId !== dto.patientId) {
        throw new BadRequestException(
          'Ce rendez-vous ne concerne pas ce patient',
        );
      }
    }

    // Le praticien est retrouve a partir de l'utilisateur connecte
    // (null si l'utilisateur n'a pas de profil praticien, ex : admin)
    const praticien = await this.prisma.praticien.findFirst({
      where: { hopitalId, utilisateurId, deletedAt: null },
    });

    return this.prisma.$transaction(async (tx) => {
      const consultation = await tx.consultation.create({
        data: {
          hopitalId,
          patientId: dto.patientId,
          praticienId: praticien?.id,
          rendezVousId: dto.rendezVousId,
          motif: dto.motif,
          observations: dto.observations,
          diagnostic: dto.diagnostic,
        },
        include: INCLUSIONS,
      });

      if (dto.rendezVousId) {
        await tx.rendezVous.update({
          where: { id: dto.rendezVousId },
          data: { statut: 'honore' },
        });
      }

      return consultation;
    });
  }

  // Lister les consultations, filtrables par patient (dossier medical)
  async findAll(hopitalId: string, patientId?: string) {
    return this.prisma.consultation.findMany({
      where: {
        hopitalId,
        deletedAt: null,
        ...(patientId ? { patientId } : {}),
      },
      orderBy: { dateConsultation: 'desc' },
      include: INCLUSIONS,
    });
  }

  // Consulter une consultation (refuse celles des autres cliniques)
  async findOne(hopitalId: string, id: string) {
    const consultation = await this.prisma.consultation.findUnique({
      where: { id },
      include: INCLUSIONS,
    });
    if (
      !consultation ||
      consultation.deletedAt ||
      consultation.hopitalId !== hopitalId
    ) {
      throw new NotFoundException(`Consultation ${id} introuvable`);
    }
    return consultation;
  }

  // Sexe du patient (seule donnee non clinique transmise a l'IA)
  async sexeDuPatient(hopitalId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
      select: { sexe: true, hopitalId: true },
    });
    if (!patient || patient.hopitalId !== hopitalId) return null;
    return patient.sexe;
  }

  // Completer ou corriger le contenu medical
  async update(hopitalId: string, id: string, dto: UpdateConsultationDto) {
    await this.findOne(hopitalId, id);
    return this.prisma.consultation.update({
      where: { id },
      data: {
        motif: dto.motif,
        observations: dto.observations,
        diagnostic: dto.diagnostic,
      },
      include: INCLUSIONS,
    });
  }
}

