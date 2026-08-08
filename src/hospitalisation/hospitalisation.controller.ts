import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { HospitalisationService } from './hospitalisation.service';
import {
  AdmissionDto,
  AnnulationSejourDto,
  CreerChambreDto,
  SortieDto,
} from './dto/hospitalisation.dto';

@Controller('hospitalisation')
export class HospitalisationController {
  constructor(private readonly service: HospitalisationService) {}

  @Get('chambres')
  @Permissions('hospitalisation.lire')
  chambres(@Req() req: any) {
    return this.service.chambres(req.user.hopitalId);
  }

  @Get('sejours')
  @Permissions('hospitalisation.lire')
  sejours(@Req() req: any) {
    return this.service.sejours(req.user.hopitalId);
  }

  @Post('chambres')
  @Permissions('hospitalisation.gerer')
  creerChambre(@Req() req: any, @Body() dto: CreerChambreDto) {
    return this.service.creerChambre(req.user.hopitalId, dto);
  }

  @Post('admissions')
  @Permissions('hospitalisation.gerer')
  admettre(@Req() req: any, @Body() dto: AdmissionDto) {
    return this.service.admettre(req.user.hopitalId, dto);
  }

  @Post('sorties')
  @Permissions('hospitalisation.gerer')
  sortie(@Req() req: any, @Body() dto: SortieDto) {
    return this.service.sortie(req.user.hopitalId, dto);
  }

  @Post('annulations')
  @Permissions('hospitalisation.gerer')
  annuler(@Req() req: any, @Body() dto: AnnulationSejourDto) {
    return this.service.annuler(req.user.hopitalId, dto);
  }
}
