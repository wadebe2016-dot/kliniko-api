import { Module } from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { RendezVousController } from './rendez-vous.controller';
import { DisponibilitesModule } from '../disponibilites/disponibilites.module';
import { ComptesModule } from '../comptes/comptes.module';
import { FacturesModule } from '../factures/factures.module';

@Module({
  imports: [DisponibilitesModule, ComptesModule, FacturesModule],
  controllers: [RendezVousController],
  providers: [RendezVousService],
})
export class RendezVousModule {}
