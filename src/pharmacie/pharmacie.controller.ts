import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PharmacieService } from './pharmacie.service';
import {
  AjustementStockDto,
  DispensationDto,
  EntreeStockDto,
} from './dto/pharmacie.dto';

@Controller('pharmacie')
export class PharmacieController {
  constructor(private readonly service: PharmacieService) {}

  @Get('stock')
  @Permissions('pharmacie.lire')
  stock(@Req() req: any) {
    return this.service.etatStock(req.user.hopitalId);
  }

  @Get('mouvements')
  @Permissions('pharmacie.lire')
  mouvements(@Req() req: any, @Query('medicamentId') medicamentId?: string) {
    return this.service.mouvements(req.user.hopitalId, medicamentId);
  }

  @Post('entrees')
  @Permissions('pharmacie.gerer')
  entree(@Req() req: any, @Body() dto: EntreeStockDto) {
    return this.service.entree(req.user.hopitalId, dto);
  }

  @Post('ajustements')
  @Permissions('pharmacie.gerer')
  ajustement(@Req() req: any, @Body() dto: AjustementStockDto) {
    return this.service.ajustement(req.user.hopitalId, dto);
  }

  @Post('dispensations')
  @Permissions('pharmacie.gerer')
  dispenser(@Req() req: any, @Body() dto: DispensationDto) {
    return this.service.dispenser(req.user.hopitalId, dto);
  }
}
