import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PatrimoineService } from './patrimoine.service';
import { PatrimoineController } from './patrimoine.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PatrimoineController],
  providers: [PatrimoineService],
})
export class PatrimoineModule {}
