import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { MediaRefDto } from '../../media/dto/media-ref.dto.js';

export class UpsertReviewDto extends MediaRefDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  rating?: number;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  liked?: boolean;

  // marcar/desmarcar como assistido; a data em si fica a cargo do servidor
  @IsOptional()
  @IsBoolean()
  watched?: boolean;
}
