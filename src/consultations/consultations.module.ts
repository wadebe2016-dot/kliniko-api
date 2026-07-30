import { Module } from '@nestjs/common';
import { ConsultationsService } from './consultations.service';
import { ConsultationsController } from './consultations.controller';
import { IaService } from './ia.service';

@Module({
  controllers: [ConsultationsController],
  providers: [ConsultationsService, IaService],
})
export class ConsultationsModule {}
