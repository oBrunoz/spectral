import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min } from 'class-validator';

const LIMITE_PADRAO = 20;
const LIMITE_MAXIMO = 50;

export class PaginationDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(LIMITE_MAXIMO)
  limit?: number;

  get take(): number {
    return this.limit ?? LIMITE_PADRAO;
  }

  get skip(): number {
    return ((this.page ?? 1) - 1) * this.take;
  }
}
