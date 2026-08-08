import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { FacturesService } from './factures.service';
import { CreateFactureDto } from './dto/create-facture.dto';
import { EncaisserDto } from './dto/encaisser.dto';
import {
  AnnulerFactureDto,
  ModifierLignesDto,
} from './dto/modifier-facture.dto';
import { Permissions } from '../auth/permissions.decorator';

@Controller('factures')
export class FacturesController {
  constructor(private readonly facturesService: FacturesService) {}

  @Post()
  @Permissions('facture.creer')
  create(@Req() req: any, @Body() dto: CreateFactureDto) {
    return this.facturesService.create(req.user.hopitalId, dto);
  }

  @Get()
  @Permissions('facture.lire')
  findAll(@Req() req: any) {
    return this.facturesService.findAll(req.user.hopitalId);
  }

  @Get(':id')
  @Permissions('facture.lire')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.facturesService.findOne(req.user.hopitalId, id);
  }

  // Modifier les lignes (facture ouverte, sans paiement)
  @Patch(':id/lignes')
  @Permissions('facture.creer')
  modifierLignes(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierLignesDto,
  ) {
    return this.facturesService.modifierLignes(req.user.hopitalId, id, dto);
  }

  // Annuler une facture (motivee, sans paiement)
  @Post(':id/annulation')
  @Permissions('facture.creer')
  annuler(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AnnulerFactureDto,
  ) {
    return this.facturesService.annuler(req.user.hopitalId, id, dto);
  }

  // Encaisser un paiement sur une facture
  @Post(':id/paiements')
  @Permissions('facture.encaisser')
  encaisser(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: EncaisserDto,
  ) {
    return this.facturesService.encaisser(req.user.hopitalId, id, dto);
  }
}
