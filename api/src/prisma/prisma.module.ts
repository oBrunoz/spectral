import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service.js';

// global pra nao reimportar em cada modulo de dominio
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
