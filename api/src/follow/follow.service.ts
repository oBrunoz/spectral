import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';

const PERFIL = { select: { id: true, name: true, avatarUrl: true, bio: true } };

@Injectable()
export class FollowService {
  constructor(private readonly prisma: PrismaService) {}

  async follow(followerId: string, followingId: string): Promise<void> {
    if (followerId === followingId) {
      throw new BadRequestException('Não dá para seguir a si mesmo');
    }

    const alvo = await this.prisma.user.findUnique({
      where: { id: followingId },
      select: { id: true },
    });
    if (!alvo) {
      throw new NotFoundException('Usuário não encontrado');
    }

    await this.prisma.follow.upsert({
      where: { followerId_followingId: { followerId, followingId } },
      create: { followerId, followingId },
      update: {},
    });
  }

  async unfollow(followerId: string, followingId: string): Promise<void> {
    const apagados = await this.prisma.follow.deleteMany({
      where: { followerId, followingId },
    });

    if (apagados.count === 0) {
      throw new NotFoundException('Você não segue esse usuário');
    }
  }

  async followers(userId: string, pagina: PaginationDto) {
    const vinculos = await this.prisma.follow.findMany({
      where: { followingId: userId },
      include: { follower: PERFIL },
      orderBy: { createdAt: 'desc' },
      take: pagina.take,
      skip: pagina.skip,
    });
    return vinculos.map((v) => v.follower);
  }

  async following(userId: string, pagina: PaginationDto) {
    const vinculos = await this.prisma.follow.findMany({
      where: { followerId: userId },
      include: { following: PERFIL },
      orderBy: { createdAt: 'desc' },
      take: pagina.take,
      skip: pagina.skip,
    });
    return vinculos.map((v) => v.following);
  }

  async counts(userId: string) {
    const [seguidores, seguindo] = await Promise.all([
      this.prisma.follow.count({ where: { followingId: userId } }),
      this.prisma.follow.count({ where: { followerId: userId } }),
    ]);
    return { seguidores, seguindo };
  }
}
