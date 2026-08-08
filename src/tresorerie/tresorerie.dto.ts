import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Min,
} from 'class-validator';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreerCompteDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom du compte est obligatoire' })
  nom: string;

  @IsIn(['caisse', 'banque', 'mobile_money'], {
    message: 'type : valeur invalide',
  })
  type: 'caisse' | 'banque' | 'mobile_money';
}

export class CreerCategorieDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom de la catégorie est obligatoire' })
  nom: string;

  @IsIn(['recette', 'depense'], { message: 'sens : valeur invalide' })
  sens: 'recette' | 'depense';
}

export class MouvementDto {
  @Matches(FORME_UUID, { message: 'compteId : identifiant invalide' })
  compteId: string;

  @IsOptional()
  @Matches(FORME_UUID, { message: 'categorieId : identifiant invalide' })
  categorieId?: string;

  @IsString()
  @IsNotEmpty({ message: 'Le libellé est obligatoire' })
  libelle: string;

  @IsOptional()
  @IsString()
  beneficiaire?: string;

  @IsNumber()
  @Min(1)
  montant: number;

  // Format ISO "2026-08-08" (defaut : aujourd'hui)
  @IsOptional()
  @IsString()
  date?: string;
}

export class TransfertDto {
  @Matches(FORME_UUID, { message: 'compteId : identifiant invalide' })
  compteId: string;

  @Matches(FORME_UUID, { message: 'compteDestId : identifiant invalide' })
  compteDestId: string;

  @IsNumber()
  @Min(1)
  montant: number;

  @IsOptional()
  @IsString()
  libelle?: string;

  @IsOptional()
  @IsString()
  date?: string;
}
