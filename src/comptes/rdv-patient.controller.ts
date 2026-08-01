import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PatientAuthGuard } from './patient-auth.guard';
import { RdvPatientService } from './rdv-patient.service';
import { DemanderRdvDto } from './dto/rdv-patient.dto';

// Toutes les routes exigent un compte patient connecte (seconde serrure).
@Controller('public/rdv')
export class RdvPatientController {
  constructor(private readonly service: RdvPatientService) {}

  @Public()
  @UseGuards(PatientAuthGuard)
  @Post()
  demander(@Req() req: any, @Body() dto: DemanderRdvDto) {
    return this.service.creerDemande(req.comptePatient.sub, dto);
  }

  @Public()
  @UseGuards(PatientAuthGuard)
  @Get()
  mesRendezVous(@Req() req: any) {
    return this.service.mesRendezVous(req.comptePatient.sub);
  }

  @Public()
  @UseGuards(PatientAuthGuard)
  @Delete(':id')
  annuler(@Req() req: any, @Param('id') id: string) {
    return this.service.annulerDemande(req.comptePatient.sub, id);
  }
}
