import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private readonly prisma: PrismaService) {}

  // Créer un patient — hopitalId vient du jeton, pas du client
  async create(hopitalId: string, dto: CreatePatientDto) {
    return this.prisma.patient.create({
      data: {
        hopitalId,
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

  // Lister les patients de la clinique de l'utilisateur connecté
  async findAll(hopitalId: string) {
    return this.prisma.patient.findMany({
      where: {
        hopitalId,
        deletedAt: null,
      },
      orderBy: { nom: 'asc' },
    });
  }

  // Consulter un patient — refuse l'accès aux patients d'autres cliniques
  async findOne(hopitalId: string, id: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id },
    });
    if (!patient || patient.deletedAt || patient.hopitalId !== hopitalId) {
      throw new NotFoundException(`Patient ${id} introuvable`);
    }
    return patient;
  }

  // Modifier un patient
  async update(hopitalId: string, id: string, dto: UpdatePatientDto) {
    await this.findOne(hopitalId, id); // vérifie existence ET appartenance
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
  async remove(hopitalId: string, id: string) {
    await this.findOne(hopitalId, id);
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
