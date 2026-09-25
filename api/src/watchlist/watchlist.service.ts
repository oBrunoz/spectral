import { Injectable, NotFoundException } from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { MediaType } from '../generated/prisma/enums.js';
import { MediaService } from '../media/media.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class WatchlistService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async list(userId: string, pagina: PaginationDto) {
    return this.prisma.watchlistItem.findMany({
      where: { userId },
      include: { media: true },
      orderBy: { addedAt: 'desc' },
      take: pagina.take,
      skip: pagina.skip,
    });
  }

  async add(userId: string, tmdbId: number, type: MediaType) {
    const media = await this.media.resolve(tmdbId, type);

    return this.prisma.watchlistItem.upsert({
      where: { userId_mediaId: { userId, mediaId: media.id } },
      create: { userId, mediaId: media.id },
      update: {},
      include: { media: true },
    });
  }

  async remove(userId: string, tmdbId: number, type: MediaType): Promise<void> {
    const media = await this.prisma.media.findUnique({
      where: { tmdbId_type: { tmdbId, type } },
    });

    const apagados = media
      ? await this.prisma.watchlistItem.deleteMany({
          where: { userId, mediaId: media.id },
        })
      : { count: 0 };

    if (apagados.count === 0) {
      throw new NotFoundException('Item não está na watchlist');
    }
  }

  async contains(
    userId: string,
    tmdbId: number,
    type: MediaType,
  ): Promise<boolean> {
    const item = await this.prisma.watchlistItem.findFirst({
      where: { userId, media: { tmdbId, type } },
      select: { id: true },
    });
    return item !== null;
  }
}
