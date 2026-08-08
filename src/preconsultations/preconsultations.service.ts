import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePreConsultationDto } from './dto/preconsultation.dto';

// Ce qui accompagne chaque pre-consultation : le patient, qui l'a prise,
// et le rendez-vous lie le cas echeant.
const AVEC_DETAILS = {
  patient: { select: { nom: true, prenom: true, numeroDossier: true } },
  utilisateur: { select: { nom: true, prenom: true } },
  rendezVous: { select: { id: true, debut: true } },
};

@Injectable()
export class PreConsultationsService {
  constructor(private readonly prisma: PrismaService) {}

  // Prendre les parametres. Une pre-consultation ne se modifie JAMAIS :
  // en cas d'erreur, on en reprend une (la trace clinique reste entiere).
  async create(
    hopitalId: string,
    utilisateurId: string | null,
    dto: CreatePreConsultationDto,
  ) {
    const patient = await this.prisma.patient.findFirst({
      where: { id: dto.patientId, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!patient) {
      throw new BadRequestException(
        `Patient ${dto.patientId} introuvable dans cette clinique`,
      );
    }

    if (dto.rendezVousId) {
      const rdv = await this.prisma.rendezVous.findFirst({
        where: {
          id: dto.rendezVousId,
          hopitalId,
          patientId: dto.patientId,
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!rdv) {
        throw new BadRequestException(
          'Ce rendez-vous ne correspond pas a ce patient',
        );
      }
    }

    const aUneConstante =
      dto.tensionSys != null ||
      dto.tensionDia != null ||
      dto.temperature != null ||
      dto.poids != null ||
      dto.taille != null ||
      dto.pouls != null ||
      dto.saturation != null;
    if (!aUneConstante && !dto.notes?.trim()) {
      throw new BadRequestException(
        'Saisissez au moins une constante ou une note',
      );
    }

    return this.prisma.preConsultation.create({
      data: {
        hopitalId,
        patientId: dto.patientId,
        rendezVousId: dto.rendezVousId ?? null,
        utilisateurId,
        tensionSys: dto.tensionSys ?? null,
        tensionDia: dto.tensionDia ?? null,
        temperature: dto.temperature ?? null,
        poids: dto.poids ?? null,
        taille: dto.taille ?? null,
        pouls: dto.pouls ?? null,
        saturation: dto.saturation ?? null,
        notes: dto.notes?.trim() || null,
      },
      include: AVEC_DETAILS,
    });
  }

  // Lister : par patient (dossier medical) ou par periode (file du jour)
  async findAll(hopitalId: string, patientId?: string, du?: string, au?: string) {
    return this.prisma.preConsultation.findMany({
      where: {
        hopitalId,
        deletedAt: null,
        ...(patientId ? { patientId } : {}),
        ...(du || au
          ? {
              datePrise: {
                ...(du ? { gte: new Date(du) } : {}),
                ...(au ? { lte: new Date(au) } : {}),
              },
            }
          : {}),
      },
      orderBy: { datePrise: 'desc' },
      take: 200,
      include: AVEC_DETAILS,
    });
  }
}
