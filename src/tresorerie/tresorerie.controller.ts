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
import { TresorerieService } from './tresorerie.service';
import {
  CreerCategorieDto,
  CreerCompteDto,
  LigneBudgetDto,
  MouvementDto,
  TransfertDto,
} from './tresorerie.dto';

@Controller('tresorerie')
export class TresorerieController {
  constructor(private readonly service: TresorerieService) {}

  @Get('comptes')
  @Permissions('tresorerie.lire')
  comptes(@Req() req: any) {
    return this.service.comptes(req.user.hopitalId);
  }

  @Post('comptes')
  @Permissions('tresorerie.gerer')
  creerCompte(@Req() req: any, @Body() dto: CreerCompteDto) {
    return this.service.creerCompte(req.user.hopitalId, dto);
  }

  @Get('categories')
  @Permissions('tresorerie.lire')
  categories(@Req() req: any) {
    return this.service.categories(req.user.hopitalId);
  }

  @Post('categories')
  @Permissions('tresorerie.gerer')
  creerCategorie(@Req() req: any, @Body() dto: CreerCategorieDto) {
    return this.service.creerCategorie(req.user.hopitalId, dto);
  }

  @Get('mouvements')
  @Permissions('tresorerie.lire')
  mouvements(
    @Req() req: any,
    @Query('du') du?: string,
    @Query('au') au?: string,
  ) {
    return this.service.mouvements(req.user.hopitalId, du, au);
  }

  @Post('recettes')
  @Permissions('tresorerie.gerer')
  recette(@Req() req: any, @Body() dto: MouvementDto) {
    return this.service.recette(req.user.hopitalId, dto);
  }

  @Post('depenses')
  @Permissions('tresorerie.gerer')
  depense(@Req() req: any, @Body() dto: MouvementDto) {
    return this.service.depense(req.user.hopitalId, dto);
  }

  @Post('transferts')
  @Permissions('tresorerie.gerer')
  transfert(@Req() req: any, @Body() dto: TransfertDto) {
    return this.service.transfert(req.user.hopitalId, dto);
  }

  @Delete('mouvements/:id')
  @Permissions('tresorerie.gerer')
  supprimer(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimer(req.user.hopitalId, id);
  }

  @Get('budget')
  @Permissions('tresorerie.lire')
  budget(@Req() req: any, @Query('annee') annee?: string) {
    const a = Number(annee) || new Date().getFullYear();
    return this.service.budget(req.user.hopitalId, a);
  }

  @Post('budget')
  @Permissions('tresorerie.gerer')
  definirLigneBudget(@Req() req: any, @Body() dto: LigneBudgetDto) {
    return this.service.definirLigneBudget(req.user.hopitalId, dto);
  }

  @Delete('budget/:id')
  @Permissions('tresorerie.gerer')
  supprimerLigneBudget(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimerLigneBudget(req.user.hopitalId, id);
  }
}
