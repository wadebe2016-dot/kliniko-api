import { Controller, Get, Req } from '@nestjs/common';
import { StatsService } from './stats.service';

// Aucune permission declaree : tout utilisateur connecte peut appeler,
// et le service ne lui rend que ce que ses permissions couvrent.
@Controller('stats')
export class StatsController {
  constructor(private readonly service: StatsService) {}

  @Get('tableau-de-bord')
  tableauDeBord(@Req() req: any) {
    return this.service.tableauDeBord(
      req.user.hopitalId,
      req.user.permissions ?? [],
    );
  }
}
