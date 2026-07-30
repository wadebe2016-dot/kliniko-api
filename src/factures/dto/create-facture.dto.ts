import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// Une ligne de facture : soit un acte du catalogue (acteId, le tarif en
// vigueur s'applique), soit une ligne libre (libelle + prixUnitaire).
export class LigneFactureDto {
  @IsOptional()
  @IsString()
  acteId?: string;

  @IsOptional()
  @IsString()
  libelle?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  quantite?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  prixUnitaire?: number;
}

export class CreateFactureDto {
  @IsString()
  patientId: string;

  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => LigneFactureDto)
  lignes: LigneFactureDto[];
}
