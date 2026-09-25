import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import argon2 from 'argon2';
import type { User } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';
import { PublicUserDto } from './dto/public-user.dto.js';

const UNIQUE_VIOLATION = 'P2002';

// faz o login gastar o mesmo tempo quando o e-mail nao existe
let hashFalso: Promise<string> | null = null;

function hashDescartavel(): Promise<string> {
  hashFalso ??= argon2.hash('login-sem-usuario', { type: argon2.argon2id });
  return hashFalso;
}

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto): Promise<PublicUserDto> {
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email.toLowerCase(),
          passwordHash,
        },
      });
      return UserService.toPublic(user);
    } catch (error) {
      if (this.isUniqueViolation(error)) {
        throw new ConflictException('E-mail ja cadastrado');
      }
      throw error;
    }
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findPublicById(id: string): Promise<PublicUserDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('Usuario nao encontrado');
    }
    return UserService.toPublic(user);
  }

  async verifyPassword(user: User | null, password: string): Promise<boolean> {
    if (!user) {
      await argon2.verify(await hashDescartavel(), password).catch(() => false);
      return false;
    }
    return argon2.verify(user.passwordHash, password);
  }

  static toPublic(user: User): PublicUserDto {
    return {
      id: user.id,
      name: user.name,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      createdAt: user.createdAt,
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: unknown }).code === UNIQUE_VIOLATION
    );
  }
}
