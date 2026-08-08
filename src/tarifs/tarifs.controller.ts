import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { TarifsService } from './tarifs.service';
import {
  CreerActeDto,
  ModifierActeDto,
  ModifierPrixMedicamentDto,
  NouveauTarifDto,
} from './tarifs.dto';

@Controller('tarifs')
export class TarifsController {
  constructor(private readonly service: TarifsService) {}

  @Get('actes')
  @Permissions('tarif.lire')
  actes(@Req() req: any) {
    return this.service.actes(req.user.hopitalId);
  }

  @Post('actes')
  @Permissions('tarif.gerer')
  creerActe(@Req() req: any, @Body() dto: CreerActeDto) {
    return this.service.creerActe(req.user.hopitalId, dto);
  }

  @Patch('actes/:id')
  @Permissions('tarif.gerer')
  modifierActe(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierActeDto,
  ) {
    return this.service.modifierActe(req.user.hopitalId, id, dto);
  }

  @Post('actes/:id/tarif')
  @Permissions('tarif.gerer')
  nouveauTarif(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: NouveauTarifDto,
  ) {
    return this.service.nouveauTarif(req.user.hopitalId, id, dto);
  }

  @Get('medicaments')
  @Permissions('tarif.lire')
  medicaments(@Req() req: any) {
    return this.service.medicaments(req.user.hopitalId);
  }

  @Patch('medicaments/:id')
  @Permissions('tarif.gerer')
  modifierPrixMedicament(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierPrixMedicamentDto,
  ) {
    return this.service.modifierPrixMedicament(req.user.hopitalId, id, dto);
  }
}
