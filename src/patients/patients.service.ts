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
        clinicId: dto.clinicId,
        recordNumber: dto.recordNumber,
        firstName: dto.firstName,
        lastName: dto.lastName,
        sex: dto.sex,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        bloodGroup: dto.bloodGroup,
        emergencyContactName: dto.emergencyContactName,
        emergencyContactPhone: dto.emergencyContactPhone,
        notes: dto.notes,
      },
    });
  }

  // Lister les patients d'une clinique (hors patients supprimés)
  async findAll(clinicId: string) {
    return this.prisma.patient.findMany({
      where: {
        clinicId,
        deletedAt: null,
      },
      orderBy: { lastName: 'asc' },
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
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
      },
    });
  }

  // Supprimer (suppression douce : on garde la donnée, on marque la date)
  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.patient.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
