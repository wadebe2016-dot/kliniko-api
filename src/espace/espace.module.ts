import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { EspaceController } from './espace.controller';
import { EspaceService } from './espace.service';

@Module({
  imports: [PrismaModule],
  controllers: [EspaceController],
  providers: [EspaceService],
})
export class EspaceModule {}
