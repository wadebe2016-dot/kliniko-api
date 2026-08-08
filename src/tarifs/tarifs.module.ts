import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PrestationsPubliquesController } from './prestations-publiques.controller';
import { TarifsService } from './tarifs.service';
import { TarifsController } from './tarifs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TarifsController, PrestationsPubliquesController],
  providers: [TarifsService],
})
export class TarifsModule {}
