import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ConsommablesService } from './consommables.service';
import { ConsommablesController } from './consommables.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ConsommablesController],
  providers: [ConsommablesService],
})
export class ConsommablesModule {}
