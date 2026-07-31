import { Controller, Get, Req } from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { OrdonnancesService } from './ordonnances.service';

@Controller('medicaments')
export class MedicamentsController {
  constructor(private readonly service: OrdonnancesService) {}

  @Get()
  @Permissions('ordonnance.lire')
  lister(@Req() req: any) {
    return this.service.listerMedicaments(req.user.hopitalId);
  }
}
