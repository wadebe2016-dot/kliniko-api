import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TresorerieService } from './tresorerie.service';
import { TresorerieController } from './tresorerie.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TresorerieController],
  providers: [TresorerieService],
})
export class TresorerieModule {}
