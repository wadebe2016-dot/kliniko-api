import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

// Les constantes sont toutes facultatives : l'infirmiere saisit ce qu'elle
// mesure. Les bornes sont volontairement larges (elles arretent les fautes
// de frappe, pas les cas cliniques extremes).
export class CreatePreConsultationDto {
  @Matches(FORME_UUID, { message: 'patientId : identifiant invalide' })
  patientId: string;

  @IsOptional()
  @Matches(FORME_UUID, { message: 'rendezVousId : identifiant invalide' })
  rendezVousId?: string;

  @IsOptional()
  @IsInt()
  @Min(40, { message: 'Tension systolique invalide' })
  @Max(300, { message: 'Tension systolique invalide' })
  tensionSys?: number;

  @IsOptional()
  @IsInt()
  @Min(20, { message: 'Tension diastolique invalide' })
  @Max(200, { message: 'Tension diastolique invalide' })
  tensionDia?: number;

  @IsOptional()
  @IsNumber()
  @Min(30, { message: 'Temperature invalide' })
  @Max(45, { message: 'Temperature invalide' })
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.5, { message: 'Poids invalide' })
  @Max(400, { message: 'Poids invalide' })
  poids?: number;

  @IsOptional()
  @IsInt()
  @Min(20, { message: 'Taille invalide' })
  @Max(260, { message: 'Taille invalide' })
  taille?: number;

  @IsOptional()
  @IsInt()
  @Min(20, { message: 'Pouls invalide' })
  @Max(260, { message: 'Pouls invalide' })
  pouls?: number;

  @IsOptional()
  @IsInt()
  @Min(30, { message: 'Saturation invalide' })
  @Max(100, { message: 'Saturation invalide' })
  saturation?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
