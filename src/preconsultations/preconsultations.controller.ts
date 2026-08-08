import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import { PreConsultationsService } from './preconsultations.service';
import { CreatePreConsultationDto } from './dto/preconsultation.dto';
import { Permissions } from '../auth/permissions.decorator';

@Controller('pre-consultations')
export class PreConsultationsController {
  constructor(private readonly service: PreConsultationsService) {}

  @Post()
  @Permissions('preconsultation.creer')
  create(@Req() req: any, @Body() dto: CreatePreConsultationDto) {
    // Qui a pris les parametres : l'utilisateur du jeton
    const utilisateurId = req.user.sub ?? req.user.id ?? null;
    return this.service.create(req.user.hopitalId, utilisateurId, dto);
  }

  // /pre-consultations?patientId=...  ou  ?du=...&au=... (file du jour)
  @Get()
  @Permissions('preconsultation.lire')
  findAll(
    @Req() req: any,
    @Query('patientId') patientId?: string,
    @Query('du') du?: string,
    @Query('au') au?: string,
  ) {
    return this.service.findAll(req.user.hopitalId, patientId, du, au);
  }
}
