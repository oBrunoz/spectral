import { Transform, Type } from 'class-transformer';
import { IsEnum, IsInt, IsPositive, Max } from 'class-validator';
import { MediaType } from '../../generated/prisma/enums.js';

// teto do int4 do Postgres: acima disso a query estoura no banco
const MAX_INT4 = 2_147_483_647;

export class MediaRefDto {
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  @Max(MAX_INT4)
  tmdbId: number;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.toUpperCase() : value,
  )
  @IsEnum(MediaType)
  mediaType: MediaType;
}
