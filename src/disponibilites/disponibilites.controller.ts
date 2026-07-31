import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { DisponibilitesService } from './disponibilites.service';
import {
  CreerHoraireDto,
  CreerIndisponibiliteDto,
} from './dto/disponibilites.dto';

// Trois familles de routes, trois niveaux d'exigence :
//  - lire (horaires, indisponibilites, creneaux) : rdv.lire
//  - declarer une absence ou un conge : rdv.modifier
//  - definir les horaires de travail : referentiel.gerer (configuration)
@Controller()
export class DisponibilitesController {
  constructor(private readonly service: DisponibilitesService) {}

  // ----------------------------- Horaires -----------------------------------
  @Get('horaires')
  @Permissions('rdv.lire')
  listerHoraires(@Req() req: any, @Query('praticienId') praticienId?: string) {
    return this.service.listerHoraires(req.user.hopitalId, praticienId);
  }

  @Post('horaires')
  @Permissions('referentiel.gerer')
  creerHoraire(@Req() req: any, @Body() dto: CreerHoraireDto) {
    return this.service.creerHoraire(req.user.hopitalId, dto);
  }

  @Delete('horaires/:id')
  @Permissions('referentiel.gerer')
  supprimerHoraire(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimerHoraire(req.user.hopitalId, id);
  }

  // -------------------------- Indisponibilites ------------------------------
  @Get('indisponibilites')
  @Permissions('rdv.lire')
  listerIndisponibilites(
    @Req() req: any,
    @Query('praticienId') praticienId?: string,
  ) {
    return this.service.listerIndisponibilites(req.user.hopitalId, praticienId);
  }

  @Post('indisponibilites')
  @Permissions('rdv.modifier')
  creerIndisponibilite(@Req() req: any, @Body() dto: CreerIndisponibiliteDto) {
    return this.service.creerIndisponibilite(req.user.hopitalId, dto);
  }

  @Delete('indisponibilites/:id')
  @Permissions('rdv.modifier')
  supprimerIndisponibilite(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimerIndisponibilite(req.user.hopitalId, id);
  }

  // ------------------------------ Creneaux -----------------------------------
  @Get('disponibilites')
  @Permissions('rdv.lire')
  creneaux(
    @Req() req: any,
    @Query('praticienId') praticienId: string,
    @Query('du') du: string,
    @Query('au') au: string,
  ) {
    return this.service.calculerCreneaux(req.user.hopitalId, praticienId, du, au);
  }
}
