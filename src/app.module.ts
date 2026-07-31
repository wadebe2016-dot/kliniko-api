import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { PatientsModule } from './patients/patients.module';
import { RendezVousModule } from './rendez-vous/rendez-vous.module';
import { FacturesModule } from './factures/factures.module';
import { ConsultationsModule } from './consultations/consultations.module';
import { UtilisateursModule } from './utilisateurs/utilisateurs.module';
import { PaiementsModule } from './paiements/paiements.module';
import { OrdonnancesModule } from './ordonnances/ordonnances.module';
import { DisponibilitesModule } from './disponibilites/disponibilites.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { PermissionsGuard } from './auth/permissions.guard';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    PatientsModule,
    RendezVousModule,
    FacturesModule,
    ConsultationsModule,
    UtilisateursModule,
    PaiementsModule,
    OrdonnancesModule,
    DisponibilitesModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // 1. le jeton JWT est exige partout (sauf routes @Public)
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // 2. puis les permissions declarees par chaque route sont verifiees
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
