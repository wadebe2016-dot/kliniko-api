import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdonnancesPatientController } from './ordonnances-patient.controller';
import { PatientAuthGuard } from '../comptes/patient-auth.guard';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [OrdonnancesPatientController],
  providers: [PatientAuthGuard],
})
export class OrdonnancesPatientModule {}
