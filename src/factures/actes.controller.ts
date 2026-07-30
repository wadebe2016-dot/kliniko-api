import { Controller, Get, Req } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { Permissions } from '../auth/permissions.decorator';

// Catalogue des actes avec leur tarif en vigueur, pour composer une facture
@Controller('actes')
export class ActesController {
  constructor(private readonly facturesService: FacturesService) {}

  @Get()
  @Permissions('facture.lire')
  findAll(@Req() req: any) {
    return this.facturesService.listerActes(req.user.hopitalId);
  }
}
