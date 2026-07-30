import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import { PatientsService } from './patients.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';
import { Permissions } from '../auth/permissions.decorator';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // hopitalId ne vient plus JAMAIS de la requête :
  // il est lu dans le jeton de l'utilisateur connecté (req.user).

  @Post()
  @Permissions('patient.creer')
  create(@Req() req: any, @Body() dto: CreatePatientDto) {
    return this.patientsService.create(req.user.hopitalId, dto);
  }

  @Get()
  @Permissions('patient.lire')
  findAll(@Req() req: any) {
    return this.patientsService.findAll(req.user.hopitalId);
  }

  @Get(':id')
  @Permissions('patient.lire')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.patientsService.findOne(req.user.hopitalId, id);
  }

  @Patch(':id')
  @Permissions('patient.modifier')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePatientDto,
  ) {
    return this.patientsService.update(req.user.hopitalId, id, dto);
  }

  @Delete(':id')
  @Permissions('patient.supprimer')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.patientsService.remove(req.user.hopitalId, id);
  }
}
