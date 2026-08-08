import { Module } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { FacturesController } from './factures.controller';
import { ActesController } from './actes.controller';

@Module({
  controllers: [FacturesController, ActesController],
  providers: [FacturesService],
  // Exporte pour le module rendez-vous : la confirmation d'un rendez-vous
  // pris en ligne genere sa facture via FacturesService.
  exports: [FacturesService],
})
export class FacturesModule {}
