import { Module } from '@nestjs/common';
import { TmdbModule } from '../tmdb/tmdb.module.js';
import { MediaService } from './media.service.js';

@Module({
  imports: [TmdbModule],
  providers: [MediaService],
  exports: [MediaService],
})
export class MediaModule {}
