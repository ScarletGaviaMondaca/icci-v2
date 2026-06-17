import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    const adapter = new PrismaMariaDb({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT!),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    console.log('✅ Prisma conectado a MariaDB');
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}