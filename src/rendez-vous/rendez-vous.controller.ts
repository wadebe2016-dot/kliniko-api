import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { UpdateRendezVousDto } from './dto/update-rendez-vous.dto';
import { Permissions } from '../auth/permissions.decorator';

@Controller('rendez-vous')
export class RendezVousController {
  constructor(private readonly rendezVousService: RendezVousService) {}

  @Post()
  @Permissions('rdv.creer')
  create(@Req() req: any, @Body() dto: CreateRendezVousDto) {
    return this.rendezVousService.create(req.user.hopitalId, dto);
  }

  // Liste, filtrable par periode : /rendez-vous?du=2026-08-03&au=2026-08-09
  @Get()
  @Permissions('rdv.lire')
  findAll(
    @Req() req: any,
    @Query('du') du?: string,
    @Query('au') au?: string,
  ) {
    return this.rendezVousService.findAll(req.user.hopitalId, du, au);
  }

  @Get(':id')
  @Permissions('rdv.lire')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.rendezVousService.findOne(req.user.hopitalId, id);
  }

  @Patch(':id')
  @Permissions('rdv.modifier')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRendezVousDto,
  ) {
    return this.rendezVousService.update(req.user.hopitalId, id, dto);
  }

  // L'annulation est un changement de statut, pas une suppression
  @Delete(':id')
  @Permissions('rdv.annuler')
  annuler(@Req() req: any, @Param('id') id: string) {
    return this.rendezVousService.annuler(req.user.hopitalId, id);
  }
}
