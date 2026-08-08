import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { HospitalisationService } from './hospitalisation.service';
import { HospitalisationController } from './hospitalisation.controller';

@Module({
  imports: [PrismaModule],
  controllers: [HospitalisationController],
  providers: [HospitalisationService],
})
export class HospitalisationModule {}
