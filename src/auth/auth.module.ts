import 'dotenv/config';
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';

@Module({
  imports: [
    JwtModule.register({
      global: true, // JwtService disponible partout (le garde en a besoin)
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '8h' }, // une journée de travail en clinique
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule {}
