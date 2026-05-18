import 'reflect-metadata';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { config as loadEnv } from 'dotenv';
import { isAbsolute, join, resolve } from 'path';
import { AppModule } from './app.module';

loadEnv();
const gac = process.env.GOOGLE_APPLICATION_CREDENTIALS?.trim();
if (gac && !isAbsolute(gac)) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = resolve(process.cwd(), gac);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(__dirname, '..', 'public'), { prefix: '/static/' });
  app.enableCors({
    origin: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );
  const port = process.env.PORT ?? 8080;
  await app.listen(port, '0.0.0.0');
}

bootstrap();
