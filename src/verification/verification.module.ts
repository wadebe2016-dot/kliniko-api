import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { VerificationController } from './verification.controller';

@Module({
  imports: [PrismaModule],
  controllers: [VerificationController],
})
export class VerificationModule {}
