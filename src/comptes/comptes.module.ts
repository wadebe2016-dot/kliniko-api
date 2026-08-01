import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../prisma/prisma.module';
import { ComptesService } from './comptes.service';
import { ComptesController } from './comptes.controller';
import { SmsService } from './sms.service';
import { PatientAuthGuard } from './patient-auth.guard';

@Module({
  imports: [PrismaModule, JwtModule.register({})],
  controllers: [ComptesController],
  providers: [ComptesService, SmsService, PatientAuthGuard],
})
export class ComptesModule {}
