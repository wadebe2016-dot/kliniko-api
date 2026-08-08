import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PharmacieService } from './pharmacie.service';
import { PharmacieController } from './pharmacie.controller';

@Module({
  imports: [PrismaModule],
  controllers: [PharmacieController],
  providers: [PharmacieService],
})
export class PharmacieModule {}
