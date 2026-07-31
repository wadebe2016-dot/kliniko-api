import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrdonnancesService } from './ordonnances.service';
import { OrdonnancesController } from './ordonnances.controller';
import { MedicamentsController } from './medicaments.controller';

@Module({
  imports: [PrismaModule],
  controllers: [OrdonnancesController, MedicamentsController],
  providers: [OrdonnancesService],
})
export class OrdonnancesModule {}
