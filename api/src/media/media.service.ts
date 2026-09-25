import { Injectable } from '@nestjs/common';
import type { Media } from '../generated/prisma/client.js';
import { MediaType } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { TmdbService } from '../tmdb/tmdb.service.js';

const VALIDADE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tmdb: TmdbService,
  ) {}

  async resolve(tmdbId: number, type: MediaType): Promise<Media> {
    const local = await this.prisma.media.findUnique({
      where: { tmdbId_type: { tmdbId, type } },
    });

    if (local && Date.now() - local.syncedAt.getTime() < VALIDADE_MS) {
      return local;
    }

    const dados = await this.tmdb.fetchMedia(tmdbId, type);

    return this.prisma.media.upsert({
      where: { tmdbId_type: { tmdbId, type } },
      create: dados,
      update: {
        title: dados.title,
        posterPath: dados.posterPath,
        releaseDate: dados.releaseDate,
      },
    });
  }
}
