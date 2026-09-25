import {
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

  // o corpo carrega a ficha inteira do usuario no titulo, nao um campo isolado:
  // desmarcar tudo apaga a ficha em vez de deixar uma linha vazia no banco
  async upsert(userId: string, dto: UpsertReviewDto) {
    const media = await this.media.resolve(dto.tmdbId, dto.mediaType);
    const where = { userId_mediaId: { userId, mediaId: media.id } };
    const anterior = await this.prisma.review.findUnique({ where });

    const texto = dto.content?.trim() || null;
    const vazia =
      dto.rating === undefined && !texto && !dto.liked && !dto.watched;

    if (vazia) {
      if (anterior) {
        await this.prisma.review.delete({ where });
      }
      return null;
    }

    const dados = {
      rating: dto.rating ?? null,
      content: texto,
      liked: dto.liked ?? false,
      // remarcar nao reescreve a data original de quando assistiu
      watchedAt: dto.watched ? (anterior?.watchedAt ?? new Date()) : null,
    };

    return this.prisma.review.upsert({
      where,
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
        ...(dto.liked !== undefined && { liked: dto.liked }),
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
