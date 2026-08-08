import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CongesController } from './conges.controller';
import { CongesService } from './conges.service';

@Module({
  imports: [PrismaModule],
  controllers: [CongesController],
  providers: [CongesService],
})
export class CongesModule {}
