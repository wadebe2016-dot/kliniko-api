import { Module } from '@nestjs/common';
import { PreConsultationsService } from './preconsultations.service';
import { PreConsultationsController } from './preconsultations.controller';

@Module({
  controllers: [PreConsultationsController],
  providers: [PreConsultationsService],
})
export class PreConsultationsModule {}
