import { Controller, Get, Req } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('praticiens')
export class PraticiensController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @Permissions('rdv.lire')
  lister(@Req() req: any) {
    return this.prisma.praticien.findMany({
      where: { hopitalId: req.user.hopitalId, deletedAt: null },
      select: { id: true, nom: true, prenom: true, specialite: true },
      orderBy: { nom: 'asc' },
    });
  }
}
