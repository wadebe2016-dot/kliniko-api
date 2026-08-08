import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class EntreeStockDto {
  @Matches(FORME_UUID, { message: 'medicamentId : identifiant invalide' })
  medicamentId: string;

  @IsInt()
  @Min(1)
  quantite: number;

  // Format ISO "2027-06-30"
  @IsOptional()
  @IsString()
  datePeremption?: string;

  @IsOptional()
  @IsNumber()
  prixAchat?: number;

  @IsOptional()
  @IsString()
  motif?: string;
}

export class AjustementStockDto {
  @Matches(FORME_UUID, { message: 'medicamentId : identifiant invalide' })
  medicamentId: string;

  // Signe : +3 retrouve trois boites, -2 en declare deux perdues
  @IsInt()
  quantite: number;

  @IsString()
  @IsNotEmpty({ message: "Un ajustement d'inventaire exige un motif" })
  motif: string;
}

export class LigneDispensationDto {
  @Matches(FORME_UUID, { message: 'medicamentId : identifiant invalide' })
  medicamentId: string;

  @IsInt()
  @Min(1)
  quantite: number;
}

export class DispensationDto {
  @Matches(FORME_UUID, { message: 'ordonnanceId : identifiant invalide' })
  ordonnanceId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneDispensationDto)
  lignes: LigneDispensationDto[];

  // true = une facture est creee avec les medicaments delivres
  @IsOptional()
  @IsBoolean()
  facturer?: boolean;
}
