import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  // Créer un patient
  async create(dto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: {
        hopitalId: dto.hopitalId,
        numeroDossier: dto.numeroDossier,
        nom: dto.nom,
        prenom: dto.prenom,
        sexe: dto.sexe,
        dateNaissance: dto.dateNaissance
          ? new Date(dto.dateNaissance)
          : undefined,
        telephone: dto.telephone,
        adresse: dto.adresse,
      },
    });
  }

  // Lister les patients d'une clinique (hors patients supprimés)
  async findAll(hopitalId: string) {
    return this.prisma.patient.findMany({
      where: {
        hopitalId,
        deletedAt: null,
      },
      orderBy: { nom: 'asc' },
    });
  }

  // Consulter un patient par son id
  async findOne(id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });
    if (!patient || patient.deletedAt) {
      throw new NotFoundException(`Patient ${id} introuvable`);
    }
    return patient;
  }

  // Modifier un patient
  async update(id: string, dto: UpdatePatientDto) {
    await this.findOne(id); // vérifie qu'il existe
    return this.prisma.patient.update({
      where: { id },
      data: {
        ...dto,
        dateNaissance: dto.dateNaissance
          ? new Date(dto.dateNaissance)
          : undefined,
      },
    });
  }

  // Suppression douce : on garde la donnée, on marque la date
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
