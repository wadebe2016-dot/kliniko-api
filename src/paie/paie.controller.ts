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
import { PaieService } from './paie.service';
import {
  GenererBulletinDto,
  GenererTousDto,
  MajParametresDto,
  MajTranchesDto,
  SimulerDto,
  VersementDto,
  VersementLotDto,
} from './paie.dto';

// Tout le module est protege par le volet RH sensible.
@Controller('paie')
export class PaieController {
  constructor(private readonly service: PaieService) {}

  @Get('parametres')
  @Permissions('personnel.rh')
  parametres(@Req() req: any) {
    return this.service.parametres(req.user.hopitalId);
  }

  @Put('parametres')
  @Permissions('personnel.rh')
  majParametres(@Req() req: any, @Body() dto: MajParametresDto) {
    return this.service.majParametres(req.user.hopitalId, dto);
  }

  @Put('tranches')
  @Permissions('personnel.rh')
  majTranches(@Req() req: any, @Body() dto: MajTranchesDto) {
    return this.service.majTranches(req.user.hopitalId, dto);
  }

  @Post('simuler')
  @Permissions('personnel.rh')
  simuler(@Req() req: any, @Body() dto: SimulerDto) {
    return this.service.simuler(req.user.hopitalId, dto);
  }

  @Get('bulletins')
  @Permissions('personnel.rh')
  bulletins(
    @Req() req: any,
    @Query('mois') mois?: string,
    @Query('annee') annee?: string,
  ) {
    return this.service.bulletins(
      req.user.hopitalId,
      mois ? Number(mois) : undefined,
      annee ? Number(annee) : undefined,
    );
  }

  @Get('livre-annuel')
  @Permissions('personnel.rh')
  livreAnnuel(@Req() req: any, @Query('annee') annee?: string) {
    const a = Number(annee) || new Date().getFullYear();
    return this.service.livreAnnuel(req.user.hopitalId, a);
  }

  @Get('bulletins/:id')
  @Permissions('personnel.rh')
  detail(@Req() req: any, @Param('id') id: string) {
    return this.service.detail(req.user.hopitalId, id);
  }

  @Post('bulletins')
  @Permissions('personnel.rh')
  generer(@Req() req: any, @Body() dto: GenererBulletinDto) {
    return this.service.generer(req.user.hopitalId, dto);
  }

  @Post('bulletins/tous')
  @Permissions('personnel.rh')
  genererTous(@Req() req: any, @Body() dto: GenererTousDto) {
    return this.service.genererTous(req.user.hopitalId, dto);
  }

  @Delete('bulletins/:id')
  @Permissions('personnel.rh')
  supprimer(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimer(req.user.hopitalId, id);
  }

  @Put('bulletins/:id/versement')
  @Permissions('personnel.rh')
  versement(@Req() req: any, @Param('id') id: string, @Body() dto: VersementDto) {
    return this.service.versement(req.user.hopitalId, id, dto);
  }

  @Post('versements/lot')
  @Permissions('personnel.rh')
  versementLot(@Req() req: any, @Body() dto: VersementLotDto) {
    return this.service.versementLot(req.user.hopitalId, dto);
  }
}
