import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
import { PublicUserDto } from './dto/public-user.dto.js';
import { UserService } from './user.service.js';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PublicUserDto> {
    return this.userService.findPublicById(id);
  }
}
