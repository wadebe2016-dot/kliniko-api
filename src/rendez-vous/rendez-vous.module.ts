import { Module } from '@nestjs/common';
import { RendezVousService } from './rendez-vous.service';
import { RendezVousController } from './rendez-vous.controller';
import { DisponibilitesModule } from '../disponibilites/disponibilites.module';
import { ComptesModule } from '../comptes/comptes.module';

@Module({
  imports: [DisponibilitesModule, ComptesModule],
  controllers: [RendezVousController],
  providers: [RendezVousService],
})
export class RendezVousModule {}
