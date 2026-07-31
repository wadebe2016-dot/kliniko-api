import { Module } from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { PaiementsController } from './paiements.controller';
import { CampayService } from './campay.service';

@Module({
  controllers: [PaiementsController],
  providers: [PaiementsService, CampayService],
})
export class PaiementsModule {}
