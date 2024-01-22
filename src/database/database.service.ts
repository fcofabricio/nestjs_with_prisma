import { Injectable, OnModuleInit } from '@nestjs/common';
import { Pool, neonConfig } from '@neondatabase/serverless';
import { PrismaNeon } from '@prisma/adapter-neon';
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as ws from 'ws';

@Injectable()
export class DatabaseService extends PrismaClient implements OnModuleInit {
  constructor() {
    dotenv.config({ path: __dirname + '/.env' });
    neonConfig.webSocketConstructor = ws;
    const connectionString = `${process.env.DATABASE_URL}`;
    const pool = new Pool({ connectionString });
    const adapter = new PrismaNeon(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }
}
