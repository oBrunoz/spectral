import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { TmdbController } from './tmdb.controller.js';
import { TmdbService } from './tmdb.service.js';

@Module({
  imports: [HttpModule.register({ timeout: 8000 })],
  controllers: [TmdbController],
  providers: [TmdbService],
  exports: [TmdbService],
})
export class TmdbModule {}
