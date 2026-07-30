import { Module } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { FacturesController } from './factures.controller';
import { ActesController } from './actes.controller';

@Module({
  controllers: [FacturesController, ActesController],
  providers: [FacturesService],
})
export class FacturesModule {}
