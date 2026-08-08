import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BulletinsPublicsController } from './bulletins-publics.controller';
import { PaieController } from './paie.controller';
import { PaieService } from './paie.service';

@Module({
  imports: [PrismaModule],
  controllers: [PaieController, BulletinsPublicsController],
  providers: [PaieService],
})
export class PaieModule {}
