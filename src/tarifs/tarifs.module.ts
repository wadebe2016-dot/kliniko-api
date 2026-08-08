import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TarifsService } from './tarifs.service';
import { TarifsController } from './tarifs.controller';

@Module({
  imports: [PrismaModule],
  controllers: [TarifsController],
  providers: [TarifsService],
})
export class TarifsModule {}
