import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { DisponibilitesModule } from '../disponibilites/disponibilites.module';
import { ComptesService } from './comptes.service';
import { ComptesController } from './comptes.controller';
import { RdvPatientService } from './rdv-patient.service';
import { RdvPatientController } from './rdv-patient.controller';
import { SmsService } from './sms.service';
import { PatientAuthGuard } from './patient-auth.guard';

@Module({
  imports: [PrismaModule, JwtModule.register({}), DisponibilitesModule],
  controllers: [ComptesController, RdvPatientController],
  providers: [ComptesService, RdvPatientService, SmsService, PatientAuthGuard],
  // Exporte pour que le module rendez-vous puisse notifier les patients
  exports: [SmsService],
})
export class ComptesModule {}
