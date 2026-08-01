import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { ComptesService } from './comptes.service';
import { PatientAuthGuard } from './patient-auth.guard';
import {
  DemanderCodeDto,
  ProfilDto,
  VerifierCodeDto,
} from './dto/comptes.dto';

// Routes patients : toutes @Public pour echapper au garde du personnel,
// puis protegees le cas echeant par le garde patient (l'autre serrure).
@Controller('public/compte')
export class ComptesController {
  constructor(private readonly service: ComptesService) {}

  @Public()
  @Post('code')
  demanderCode(@Body() dto: DemanderCodeDto) {
    return this.service.demanderCode(dto.telephone);
  }

  @Public()
  @Post('verifier')
  verifier(@Body() dto: VerifierCodeDto) {
    return this.service.verifier(dto.telephone, dto.code);
  }

  @Public()
  @UseGuards(PatientAuthGuard)
  @Get('moi')
  moi(@Req() req: any) {
    return this.service.moi(req.comptePatient.sub);
  }

  @Public()
  @UseGuards(PatientAuthGuard)
  @Post('profil')
  profil(@Req() req: any, @Body() dto: ProfilDto) {
    return this.service.completerProfil(req.comptePatient.sub, dto);
  }
}
