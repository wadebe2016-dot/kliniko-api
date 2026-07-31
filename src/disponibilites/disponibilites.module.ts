import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DisponibilitesService } from './disponibilites.service';
import { DisponibilitesController } from './disponibilites.controller';
import { PraticiensController } from './praticiens.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DisponibilitesController, PraticiensController],
  providers: [DisponibilitesService],
  // Exporte pour que le module rendez-vous puisse verifier les conflits
  exports: [DisponibilitesService],
})
export class DisponibilitesModule {}
