import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PersonnelService } from './personnel.service';
import { PersonnelController } from './personnel.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PersonnelController],
  providers: [PersonnelService],
})
export class PersonnelModule {}
