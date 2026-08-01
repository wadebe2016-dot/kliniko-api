import { Controller, Get, Param, Query } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PublicService } from './public.service';

@Controller('public')
export class PublicController {
  constructor(private readonly service: PublicService) {}

  @Public()
  @Get('cliniques')
  cliniques(@Query('ville') ville?: string) {
    return this.service.listerCliniques(ville);
  }

  @Public()
  @Get('cliniques/:id/praticiens')
  praticiens(@Param('id') id: string) {
    return this.service.listerPraticiens(id);
  }

  @Public()
  @Get('cliniques/:id/praticiens/:praticienId/creneaux')
  creneaux(
    @Param('id') id: string,
    @Param('praticienId') praticienId: string,
    @Query('du') du: string,
    @Query('au') au: string,
  ) {
    return this.service.creneaux(id, praticienId, du, au);
  }
}
