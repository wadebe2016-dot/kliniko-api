import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { CreateConsultationDto } from './dto/create-consultation.dto';
import { UpdateConsultationDto } from './dto/update-consultation.dto';
import { Permissions } from '../auth/permissions.decorator';

@Controller('consultations')
export class ConsultationsController {
  constructor(private readonly consultationsService: ConsultationsService) {}

  @Post()
  @Permissions('consultation.creer')
  create(@Req() req: any, @Body() dto: CreateConsultationDto) {
    return this.consultationsService.create(
      req.user.hopitalId,
      req.user.sub,
      dto,
    );
  }

  // Liste, filtrable par patient : /consultations?patientId=...
  @Get()
  @Permissions('consultation.lire')
  findAll(@Req() req: any, @Query('patientId') patientId?: string) {
    return this.consultationsService.findAll(req.user.hopitalId, patientId);
  }

  @Get(':id')
  @Permissions('consultation.lire')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.consultationsService.findOne(req.user.hopitalId, id);
  }

  @Patch(':id')
  @Permissions('consultation.modifier')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateConsultationDto,
  ) {
    return this.consultationsService.update(req.user.hopitalId, id, dto);
  }
}
