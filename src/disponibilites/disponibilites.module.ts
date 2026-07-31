import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DisponibilitesService } from './disponibilites.service';
import { DisponibilitesController } from './disponibilites.controller';

@Module({
  imports: [PrismaModule],
  controllers: [DisponibilitesController],
  providers: [DisponibilitesService],
  // Exporte pour que le module rendez-vous puisse verifier les conflits
  exports: [DisponibilitesService],
})
export class DisponibilitesModule {}
