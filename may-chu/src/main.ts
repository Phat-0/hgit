import type {Request,Response,NextFunction} from 'express';
import 'dotenv/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  if(process.env.TRUST_PROXY)app.getHttpAdapter().getInstance().set('trust proxy',process.env.TRUST_PROXY.split(',').map(v=>v.trim()).filter(Boolean));
  app.use((_req:Request,res:Response,next:NextFunction)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');next();});
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
