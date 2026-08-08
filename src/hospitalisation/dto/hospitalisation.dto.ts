import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class CreerChambreDto {
  @IsString()
  @IsNotEmpty({ message: 'Le numero de chambre est obligatoire' })
  numero: string;

  // Standard, Privee, VIP... texte libre
  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  tarifJournalier?: number;

  @IsInt()
  @Min(1)
  @Max(20)
  nbLits: number;
}

export class AdmissionDto {
  @Matches(FORME_UUID, { message: 'patientId : identifiant invalide' })
  patientId: string;

  @Matches(FORME_UUID, { message: 'litId : identifiant invalide' })
  litId: string;

  @IsOptional()
  @Matches(FORME_UUID, { message: 'praticienId : identifiant invalide' })
  praticienId?: string;

  @IsString()
  @IsNotEmpty({ message: "Le motif d'admission est obligatoire" })
  motif: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class SortieDto {
  @Matches(FORME_UUID, { message: 'hospitalisationId : identifiant invalide' })
  hospitalisationId: string;

  // true = une facture est creee (jours x tarif journalier de la chambre)
  @IsOptional()
  @IsBoolean()
  facturer?: boolean;
}

export class AnnulationSejourDto {
  @Matches(FORME_UUID, { message: 'hospitalisationId : identifiant invalide' })
  hospitalisationId: string;

  @IsString()
  @IsNotEmpty({ message: "L'annulation d'un sejour exige un motif" })
  motif: string;
}
