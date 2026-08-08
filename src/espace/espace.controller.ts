import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { EspaceService } from './espace.service';
import { CreerMaDemandeDto } from './espace.dto';

// Espace personnel : aucune permission requise, chaque utilisateur
// connecte n'accede qu'a SES propres donnees (fiche liee au compte).
@Controller('moi')
export class EspaceController {
  constructor(private readonly service: EspaceService) {}

  @Get('apercu')
  apercu(@Req() req: any) {
    return this.service.apercu(req.user.hopitalId, req.user);
  }

  @Get('conges')
  mesConges(@Req() req: any) {
    return this.service.mesConges(req.user.hopitalId, req.user);
  }

  @Post('conges')
  creerConge(@Req() req: any, @Body() dto: CreerMaDemandeDto) {
    return this.service.creerConge(req.user.hopitalId, req.user, dto);
  }

  @Get('bulletins')
  mesBulletins(@Req() req: any, @Query('annee') annee?: string) {
    return this.service.mesBulletins(
      req.user.hopitalId,
      req.user,
      annee ? Number(annee) : undefined,
    );
  }
}
