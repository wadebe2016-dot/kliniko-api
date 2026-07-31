import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';

// Une ligne de prescription. Le libelle est recopie ici au moment de la
// redaction : si le referentiel change plus tard, l'ordonnance reste lisible
// telle qu'elle a ete ecrite.
export class LigneOrdonnanceDto {
  @IsOptional()
  @IsUUID()
  medicamentId?: string;

  @IsString()
  @IsNotEmpty()
  libelle: string;

  @IsString()
  @IsNotEmpty()
  posologie: string;

  @IsOptional()
  @IsString()
  duree?: string;

  @IsOptional()
  @IsString()
  quantite?: string;

  @IsOptional()
  @IsString()
  voie?: string;

  @IsOptional()
  @IsString()
  instructions?: string;
}

export class CreerOrdonnanceDto {
  @IsUUID()
  patientId: string;

  @IsOptional()
  @IsUUID()
  consultationId?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  // true = redigee et signee dans la foulee ; sinon elle reste en brouillon.
  @IsOptional()
  @IsBoolean()
  valider?: boolean;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneOrdonnanceDto)
  lignes: LigneOrdonnanceDto[];
}
