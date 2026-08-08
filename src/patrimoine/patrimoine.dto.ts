import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreerActifDto {
  @IsString()
  @IsNotEmpty({ message: 'La désignation est obligatoire' })
  designation: string;

  @IsOptional()
  @IsString()
  code?: string;

  // Equipement medical, Mobilier, Vehicule, Batiment, Informatique, Energie...
  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  localisation?: string;

  // Format ISO "2024-05-12"
  @IsOptional()
  @IsString()
  dateAcquisition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valeurAcquisition?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ModifierActifDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La désignation ne peut pas être vide' })
  designation?: string;

  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  localisation?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valeurAcquisition?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ChangerEtatDto {
  @IsIn(['en_service', 'en_maintenance', 'en_panne', 'reforme'], {
    message: 'etat : valeur invalide',
  })
  etat: 'en_service' | 'en_maintenance' | 'en_panne' | 'reforme';

  @IsString()
  @IsNotEmpty({ message: "Un changement d'état exige un motif" })
  motif: string;
}
