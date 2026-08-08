import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PatrimoineService } from './patrimoine.service';
import {
  CreerActifDto,
  CreerContratDto,
  CreerInterventionDto,
  ModifierActifDto,
  ModifierContratDto,
  ModifierInterventionDto,
} from './patrimoine.dto';

@Controller('patrimoine')
export class PatrimoineController {
  constructor(private readonly service: PatrimoineService) {}

  // ------------------------------- Actifs -----------------------------------

  @Get('actifs')
  @Permissions('patrimoine.lire')
  actifs(
    @Req() req: any,
    @Query('categorie') categorie?: string,
    @Query('etat') etat?: string,
  ) {
    return this.service.actifs(req.user.hopitalId, categorie, etat);
  }

  @Get('actifs/:id')
  @Permissions('patrimoine.lire')
  detail(@Req() req: any, @Param('id') id: string) {
    return this.service.detail(req.user.hopitalId, id);
  }

  @Post('actifs')
  @Permissions('patrimoine.gerer')
  creer(@Req() req: any, @Body() dto: CreerActifDto) {
    return this.service.creer(req.user.hopitalId, dto);
  }

  @Patch('actifs/:id')
  @Permissions('patrimoine.gerer')
  modifier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierActifDto,
  ) {
    return this.service.modifier(req.user.hopitalId, id, dto);
  }

  @Delete('actifs/:id')
  @Permissions('patrimoine.gerer')
  supprimerActif(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimerActif(req.user.hopitalId, id);
  }

  // --------------------------- Interventions --------------------------------

  @Post('actifs/:id/interventions')
  @Permissions('patrimoine.gerer')
  creerIntervention(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: CreerInterventionDto,
  ) {
    return this.service.creerIntervention(req.user.hopitalId, id, dto);
  }

  @Put('interventions/:id')
  @Permissions('patrimoine.gerer')
  modifierIntervention(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierInterventionDto,
  ) {
    return this.service.modifierIntervention(req.user.hopitalId, id, dto);
  }

  @Delete('interventions/:id')
  @Permissions('patrimoine.gerer')
  supprimerIntervention(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimerIntervention(req.user.hopitalId, id);
  }

  // ------------------------------ Contrats -----------------------------------

  @Get('contrats')
  @Permissions('patrimoine.lire')
  contrats(@Req() req: any, @Query('type') type?: string) {
    return this.service.contrats(req.user.hopitalId, type);
  }

  @Post('contrats')
  @Permissions('patrimoine.gerer')
  creerContrat(@Req() req: any, @Body() dto: CreerContratDto) {
    return this.service.creerContrat(req.user.hopitalId, dto);
  }

  @Put('contrats/:id')
  @Permissions('patrimoine.gerer')
  modifierContrat(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierContratDto,
  ) {
    return this.service.modifierContrat(req.user.hopitalId, id, dto);
  }

  @Delete('contrats/:id')
  @Permissions('patrimoine.gerer')
  supprimerContrat(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimerContrat(req.user.hopitalId, id);
  }
}
