import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PatientsModule } from './patients/patients.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';

@Module({
  imports: [PrismaModule, AuthModule, PatientsModule],
  controllers: [AppController],
  providers: [
    AppService,
    // Gardes globaux, dans cet ordre :
    // 1. le jeton JWT est exige partout (sauf routes @Public)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 2. puis les permissions declarees par chaque route sont verifiees
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
