import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const TYPES_CONGE = [
  'annuel',
  'maladie',
  'maternite',
  'exceptionnel',
  'sans_solde',
] as const;

export class MajParametresCongesDto {
  @IsInt()
  @Min(0)
  joursAcquisAnnuel: number;
}

export class CreerDemandeDto {
  @Matches(FORME_UUID, { message: 'personnelId : identifiant invalide' })
  personnelId: string;

  @IsOptional()
  @IsIn(TYPES_CONGE as unknown as string[], { message: 'type : valeur invalide' })
  type?: string;

  // Format ISO "2026-09-01"
  @IsString()
  @IsNotEmpty({ message: 'La date de début est requise' })
  dateDebut: string;

  @IsString()
  @IsNotEmpty({ message: 'La date de fin est requise' })
  dateFin: string;

  @IsOptional()
  @IsString()
  motif?: string;
}

export class StatuerDto {
  @IsIn(['approuve', 'refuse'], { message: 'statut : valeur invalide' })
  statut: 'approuve' | 'refuse';

  @IsOptional()
  @IsString()
  commentaire?: string;
}
