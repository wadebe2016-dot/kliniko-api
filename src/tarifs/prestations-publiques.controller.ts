import { Controller, Get, NotFoundException, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Mercuriale publique d'une clinique : les actes et leur tarif EN VIGUEUR
// (toujours calcule a la lecture, jamais fige). Sert a la prise de RDV
// patient : la prestation choisie affiche le montant du.
@Controller('public/cliniques')
export class PrestationsPubliquesController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get(':id/prestations')
  async prestations(@Param('id') id: string) {
    if (!FORME_UUID.test(id)) {
      throw new NotFoundException('Clinique introuvable');
    }
    const clinique = await this.prisma.hopital.findFirst({
      where: { id },
      select: { id: true },
    });
    if (!clinique) throw new NotFoundException('Clinique introuvable');

    const maintenant = new Date();
    const actes = await this.prisma.acte.findMany({
      where: { hopitalId: id, deletedAt: null },
      orderBy: { libelle: 'asc' },
      include: {
        tarifs: {
          where: {
            deletedAt: null,
            dateDebut: { lte: maintenant },
            OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }],
          },
          orderBy: { dateDebut: 'desc' },
          take: 1,
        },
      },
    });
    // Seuls les actes ayant un tarif en vigueur sont proposes au patient.
    return actes
      .filter((a) => a.tarifs.length > 0)
      .map((a) => ({
        id: a.id,
        code: a.code,
        libelle: a.libelle,
        tarif: Number(a.tarifs[0].montant),
        devise: a.tarifs[0].devise,
      }));
  }
}
