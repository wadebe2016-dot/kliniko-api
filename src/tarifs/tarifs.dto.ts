import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreerActeDto {
  @IsString()
  @IsNotEmpty({ message: "Le code de l'acte est obligatoire" })
  code: string;

  @IsString()
  @IsNotEmpty({ message: "Le libellé de l'acte est obligatoire" })
  libelle: string;

  // Tarif initial (optionnel : un acte sans tarif ne peut pas etre facture)
  @IsOptional()
  @IsNumber()
  @Min(0)
  montant?: number;
}

export class ModifierActeDto {
  @IsString()
  @IsNotEmpty({ message: 'Le libellé ne peut pas être vide' })
  libelle: string;
}

export class NouveauTarifDto {
  @IsNumber()
  @Min(0)
  montant: number;
}

export class ModifierPrixMedicamentDto {
  @IsNumber()
  @Min(0)
  prixVente: number;
}

export class CreerMedicamentDto {
  @IsString()
  @IsNotEmpty({ message: 'La dénomination est obligatoire' })
  denomination: string;

  @IsOptional()
  @IsString()
  dosage?: string;

  // Comprime, Gelule, Sirop, Injectable...
  @IsOptional()
  @IsString()
  forme?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  prixVente?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  seuilAlerte?: number;
}
