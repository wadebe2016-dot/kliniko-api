import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { PatientAuthGuard } from '../comptes/patient-auth.guard';

// Les ordonnances signees suivent le patient dans son application.
// @Public pour echapper au garde du personnel, puis garde patient
// (l'autre serrure). On ne montre que les ordonnances VALIDEES des
// dossiers relies a ce compte.
@Controller('public/compte')
export class OrdonnancesPatientController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @UseGuards(PatientAuthGuard)
  @Get('ordonnances')
  async mesOrdonnances(@Req() req: any) {
    const compteId: string = req.comptePatient.sub;

    const dossiers = await this.prisma.comptePatientDossier.findMany({
      where: { compteId },
      select: { patientId: true },
    });
    if (dossiers.length === 0) return [];

    return this.prisma.ordonnance.findMany({
      where: {
        patientId: { in: dossiers.map((d) => d.patientId) },
        statut: 'validee',
        deletedAt: null,
      },
      select: {
        id: true,
        numero: true,
        dateOrdonnance: true,
        notes: true,
        hopital: { select: { nom: true, ville: true } },
        praticien: { select: { nom: true, prenom: true, specialite: true } },
        lignes: {
          select: {
            libelle: true,
            posologie: true,
            duree: true,
            quantite: true,
            voie: true,
            instructions: true,
          },
        },
      },
      orderBy: { dateOrdonnance: 'desc' },
      take: 50,
    });
  }
}
