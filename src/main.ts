import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { RequestMethod } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('v1', {
    exclude: [{ path: 'health', method: RequestMethod.GET }],
  });
  app.enableCors((req, callback) => {
    const whitelist = ['http://localhost:3000', 'http://localhost:4200'];
    const corsOptions = {
      origin: whitelist.includes(req.header('Origin'))
        ? req.header('Origin')
        : false,
      credentials: true,
    };
    callback(null, corsOptions);
  });

  await app.listen(3000);
}
bootstrap();
