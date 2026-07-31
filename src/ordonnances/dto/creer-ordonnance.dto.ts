import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  ValidateNested,
} from 'class-validator';

// Les identifiants des donnees de demonstration ont ete ecrits a la main
// (a0000000-0000-0000-0000-000000000001) et ne portent pas de numero de
// version. Depuis que class-validator a durci son controle, @IsUUID les
// refuse. On verifie donc la forme de l'identifiant, pas sa version : les
// valeurs fantaisistes sont toujours rejetees.
export const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Une ligne de prescription. Le libelle est recopie ici au moment de la
// redaction : si le referentiel change plus tard, l'ordonnance reste lisible
// telle qu'elle a ete ecrite.
export class LigneOrdonnanceDto {
  @IsOptional()
  @Matches(FORME_UUID, { message: 'medicamentId : identifiant invalide' })
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
  @Matches(FORME_UUID, { message: 'patientId : identifiant invalide' })
  patientId: string;

  @IsOptional()
  @Matches(FORME_UUID, { message: 'consultationId : identifiant invalide' })
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
