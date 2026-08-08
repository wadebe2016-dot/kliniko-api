import {
  IsArray,
  IsIn,
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

export class MajParametresDto {
  @IsNumber()
  @Min(0)
  tauxCnpsSalarial: number;

  @IsNumber()
  @Min(0)
  plafondCnps: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  abattementFraisPct: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  cacPct: number;
}

// Tranches et primes : tableaux valides finement dans le service
// (pas de validation imbriquee pour rester sans class-transformer).
export class MajTranchesDto {
  @IsArray()
  tranches: { borneMin: number; borneMax?: number | null; taux: number }[];
}

export class SimulerDto {
  @IsNumber()
  @Min(0)
  salaireBase: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  totalPrimes?: number;
}

export class GenererBulletinDto {
  @Matches(FORME_UUID, { message: 'personnelId : identifiant invalide' })
  personnelId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  mois: number;

  @IsInt()
  @Min(2020)
  annee: number;

  @IsOptional()
  @IsArray()
  primes?: { libelle: string; montant: number }[];
}

export class GenererTousDto {
  @IsInt()
  @Min(1)
  @Max(12)
  mois: number;

  @IsInt()
  @Min(2020)
  annee: number;
}

export class VersementDto {
  @IsIn(['paye', 'en_attente'], { message: 'statut : valeur invalide' })
  statut: 'paye' | 'en_attente';

  // Format ISO "2026-08-31" (defaut : aujourd'hui)
  @IsOptional()
  @IsString()
  dateVersement?: string;

  @IsOptional()
  @IsIn(['virement', 'momo', 'especes'], {
    message: 'modeVersement : valeur invalide',
  })
  modeVersement?: 'virement' | 'momo' | 'especes';
}

export class VersementLotDto {
  @IsInt()
  @Min(1)
  @Max(12)
  mois: number;

  @IsInt()
  @Min(2020)
  annee: number;

  @IsOptional()
  @IsString()
  dateVersement?: string;

  @IsOptional()
  @IsIn(['virement', 'momo', 'especes'], {
    message: 'modeVersement : valeur invalide',
  })
  modeVersement?: 'virement' | 'momo' | 'especes';
}
