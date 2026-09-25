import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { MediaType } from '../generated/prisma/enums.js';
import { MediaService } from '../media/media.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateReviewDto } from './dto/update-review.dto.js';
import { UpsertReviewDto } from './dto/upsert-review.dto.js';

const AUTOR = { select: { id: true, name: true, avatarUrl: true } };

@Injectable()
export class ReviewService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly media: MediaService,
  ) {}

  async upsert(userId: string, dto: UpsertReviewDto) {
    if (dto.rating === undefined && !dto.content?.trim()) {
      throw new BadRequestException('Informe ao menos uma nota ou um texto');
    }

    const media = await this.media.resolve(dto.tmdbId, dto.mediaType);
    const dados = {
      rating: dto.rating ?? null,
      content: dto.content ?? null,
      watchedAt: dto.watchedAt ? new Date(dto.watchedAt) : null,
    };

    return this.prisma.review.upsert({
      where: { userId_mediaId: { userId, mediaId: media.id } },
      create: { userId, mediaId: media.id, ...dados },
      update: dados,
      include: { media: true, user: AUTOR },
    });
  }

  async update(userId: string, reviewId: string, dto: UpdateReviewDto) {
    await this.assertDono(userId, reviewId);

    return this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating !== undefined && { rating: dto.rating }),
        ...(dto.content !== undefined && { content: dto.content }),
        ...(dto.watchedAt !== undefined && {
          watchedAt: new Date(dto.watchedAt),
        }),
      },
      include: { media: true, user: AUTOR },
    });
  }

  async remove(userId: string, reviewId: string): Promise<void> {
    await this.assertDono(userId, reviewId);
    await this.prisma.review.delete({ where: { id: reviewId } });
  }

  minhaNoTitulo(userId: string, tmdbId: number, type: MediaType) {
    return this.prisma.review.findFirst({
      where: { userId, media: { tmdbId, type } },
      include: { media: true, user: AUTOR },
    });
  }

  listByMedia(tmdbId: number, type: MediaType, pagina: PaginationDto) {
    return this.prisma.review.findMany({
      where: { media: { tmdbId, type } },
      include: { user: AUTOR },
      orderBy: { createdAt: 'desc' },
      take: pagina.take,
      skip: pagina.skip,
    });
  }

  listByUser(userId: string, pagina: PaginationDto) {
    return this.prisma.review.findMany({
      where: { userId },
      include: { media: true },
      orderBy: { createdAt: 'desc' },
      take: pagina.take,
      skip: pagina.skip,
    });
  }

  private async assertDono(userId: string, reviewId: string): Promise<void> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
      select: { userId: true },
    });

    if (!review) {
      throw new NotFoundException('Review não encontrada');
    }

    if (review.userId !== userId) {
      throw new ForbiddenException('Essa review não é sua');
    }
  }
}
