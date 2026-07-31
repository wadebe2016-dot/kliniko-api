import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { OrdonnancesService } from './ordonnances.service';
import { CreerOrdonnanceDto } from './dto/creer-ordonnance.dto';
import {
  AnnulerOrdonnanceDto,
  ModifierOrdonnanceDto,
} from './dto/modifier-ordonnance.dto';

@Controller('ordonnances')
export class OrdonnancesController {
  constructor(private readonly service: OrdonnancesService) {}

  @Get()
  @Permissions('ordonnance.lire')
  lister(
    @Req() req: any,
    @Query('patientId') patientId?: string,
    @Query('consultationId') consultationId?: string,
  ) {
    return this.service.lister(req.user.hopitalId, {
      patientId,
      consultationId,
    });
  }

  @Get(':id')
  @Permissions('ordonnance.lire')
  trouver(@Req() req: any, @Param('id') id: string) {
    return this.service.trouver(req.user.hopitalId, id);
  }

  @Post()
  @Permissions('ordonnance.creer')
  creer(@Req() req: any, @Body() dto: CreerOrdonnanceDto) {
    return this.service.creer(req.user.hopitalId, req.user.sub, dto);
  }

  @Put(':id')
  @Permissions('ordonnance.creer')
  modifier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierOrdonnanceDto,
  ) {
    return this.service.modifier(req.user.hopitalId, id, dto);
  }

  @Post(':id/valider')
  @Permissions('ordonnance.creer')
  valider(@Req() req: any, @Param('id') id: string) {
    return this.service.valider(req.user.hopitalId, id);
  }

  @Delete(':id')
  @Permissions('ordonnance.creer')
  annuler(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AnnulerOrdonnanceDto,
  ) {
    return this.service.annuler(req.user.hopitalId, id, dto?.motif);
  }
}
