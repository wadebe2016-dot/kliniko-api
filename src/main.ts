import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Validation automatique des donnees entrantes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ignore les champs non declares
      forbidNonWhitelisted: true, // rejette les champs inconnus
      transform: true, // convertit les types automatiquement
    }),
  );

  // CORS restreint : seul le frontend autorise peut appeler l'API
  // depuis un navigateur. Modifiable via CORS_ORIGIN dans .env
  // (plusieurs origines possibles, separees par des virgules).
  app.enableCors({
    origin: process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',')
      : ['http://localhost:5173'],
  });

  await app.listen(3000, '0.0.0.0');
}
bootstrap();
