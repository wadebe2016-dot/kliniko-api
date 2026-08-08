import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreerConsommableDto {
  @IsString()
  @IsNotEmpty({ message: 'La designation est obligatoire' })
  designation: string;

  @IsOptional()
  @IsString()
  code?: string;

  // boite de 100, rouleau, flacon...
  @IsOptional()
  @IsString()
  unite?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  seuilAlerte?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  prixUnitaire?: number;
}

export class EntreeConsommableDto {
  @Matches(FORME_UUID, { message: 'consommableId : identifiant invalide' })
  consommableId: string;

  @IsInt()
  @Min(1)
  quantite: number;

  // Date du mouvement, format ISO "2026-07-10" (defaut : aujourd'hui)
  @IsOptional()
  @IsString()
  date?: string;

  // Format ISO "2027-06-30"
  @IsOptional()
  @IsString()
  datePeremption?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  prixAchat?: number;

  @IsOptional()
  @IsString()
  motif?: string;
}

export class SortieConsommableDto {
  @Matches(FORME_UUID, { message: 'consommableId : identifiant invalide' })
  consommableId: string;

  @IsInt()
  @Min(1)
  quantite: number;

  // Date du mouvement, format ISO "2026-07-10" (defaut : aujourd'hui)
  @IsOptional()
  @IsString()
  date?: string;

  // Qui consomme et pourquoi : "Salle de soins", "Bloc", "Consultation"...
  @IsString()
  @IsNotEmpty({ message: 'Indiquez le service ou le motif de la consommation' })
  motif: string;
}

export class AjustementConsommableDto {
  @Matches(FORME_UUID, { message: 'consommableId : identifiant invalide' })
  consommableId: string;

  // Signe : +3 retrouve trois boites, -2 en declare deux perdues
  @IsInt()
  quantite: number;

  @IsString()
  @IsNotEmpty({ message: "Un ajustement d'inventaire exige un motif" })
  motif: string;
}
