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
import { CongesService } from './conges.service';
import {
  CreerDemandeDto,
  MajParametresCongesDto,
  StatuerDto,
} from './conges.dto';

// Tout le module est protege par le volet RH sensible.
@Controller('conges')
export class CongesController {
  constructor(private readonly service: CongesService) {}

  @Get('parametres')
  @Permissions('personnel.rh')
  parametres(@Req() req: any) {
    return this.service.parametres(req.user.hopitalId);
  }

  @Put('parametres')
  @Permissions('personnel.rh')
  majParametres(@Req() req: any, @Body() dto: MajParametresCongesDto) {
    return this.service.majParametres(req.user.hopitalId, dto);
  }

  @Get('soldes')
  @Permissions('personnel.rh')
  soldes(@Req() req: any, @Query('annee') annee?: string) {
    const a = Number(annee) || new Date().getFullYear();
    return this.service.soldes(req.user.hopitalId, a);
  }

  @Get()
  @Permissions('personnel.rh')
  liste(@Req() req: any, @Query('statut') statut?: string) {
    return this.service.liste(req.user.hopitalId, statut);
  }

  @Post()
  @Permissions('personnel.rh')
  creer(@Req() req: any, @Body() dto: CreerDemandeDto) {
    return this.service.creer(req.user.hopitalId, dto);
  }

  @Put(':id/statut')
  @Permissions('personnel.rh')
  statuer(@Req() req: any, @Param('id') id: string, @Body() dto: StatuerDto) {
    return this.service.statuer(req.user.hopitalId, id, dto);
  }

  @Delete(':id')
  @Permissions('personnel.rh')
  supprimer(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimer(req.user.hopitalId, id);
  }
}
