import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DisponibilitesModule } from '../disponibilites/disponibilites.module';
import { PublicService } from './public.service';
import { PublicController } from './public.controller';

@Module({
  imports: [PrismaModule, DisponibilitesModule],
  controllers: [PublicController],
  providers: [PublicService],
})
export class PublicModule {}
