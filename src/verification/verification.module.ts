import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import {
  VerificationController,
  VerificationFacturesController,
} from './verification.controller';

@Module({
  imports: [PrismaModule],
  controllers: [VerificationController, VerificationFacturesController],
})
export class VerificationModule {}
