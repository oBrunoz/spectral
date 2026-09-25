import { Injectable, UnauthorizedException } from '@nestjs/common';
import { CreateUserDto } from '../user/dto/create-user.dto.js';
import { PublicUserDto } from '../user/dto/public-user.dto.js';
import { UserService } from '../user/user.service.js';
import { LoginDto } from './dto/login.dto.js';
import { TokenPair, TokenService } from './token.service.js';

export interface AuthResult {
  user: PublicUserDto;
  tokens: TokenPair;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly tokenService: TokenService,
  ) {}

  async me(userId: string): Promise<PublicUserDto> {
    return await this.userService.findPublicById(userId);
  }

  async register(dto: CreateUserDto): Promise<AuthResult> {
    const user = await this.userService.create(dto);
    return { user, tokens: await this.tokenService.issue(user.id) };
  }

  async login(dto: LoginDto): Promise<AuthResult> {
    const user = await this.userService.findByEmail(dto.email);

    // mesma mensagem para e-mail inexistente e senha errada:
    // responder "e-mail nao cadastrado" entrega quem tem conta no site
    if (!user || !(await this.userService.verifyPassword(user, dto.password))) {
      throw new UnauthorizedException('E-mail ou senha invalidos');
    }

    return {
      user: UserService.toPublic(user),
      tokens: await this.tokenService.issue(user.id),
    };
  }

  refresh(refreshToken: string): Promise<TokenPair> {
    return this.tokenService.rotate(refreshToken);
  }

  logout(refreshToken: string): Promise<void> {
    return this.tokenService.revoke(refreshToken);
  }
}
