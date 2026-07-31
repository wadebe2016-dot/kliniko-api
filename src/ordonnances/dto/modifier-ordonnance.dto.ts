import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { LigneOrdonnanceDto } from './creer-ordonnance.dto';

export class ModifierOrdonnanceDto {
  @IsOptional()
  @IsString()
  notes?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneOrdonnanceDto)
  lignes: LigneOrdonnanceDto[];
}

export class AnnulerOrdonnanceDto {
  @IsOptional()
  @IsString()
  motif?: string;
}
