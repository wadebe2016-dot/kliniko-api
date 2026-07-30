import { Module } from '@nestjs/common';
import { FacturesService } from './factures.service';
import { FacturesController } from './factures.controller';

@Module({
  controllers: [FacturesController],
  providers: [FacturesService],
})
export class FacturesModule {}
