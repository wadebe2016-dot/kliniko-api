import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { CreateFactureDto } from './dto/create-facture.dto';
import { EncaisserDto } from './dto/encaisser.dto';
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
