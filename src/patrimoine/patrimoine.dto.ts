import {
  IsBoolean,
  IsIn,
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

export const ETATS_ACTIF = [
  'bon',
  'moyen',
  'en_reparation',
  'hors_service',
  'cede',
] as const;

export const TYPES_INTERVENTION = [
  'panne',
  'reparation',
  'entretien',
  'controle',
] as const;

export const STATUTS_INTERVENTION = [
  'ouverte',
  'en_cours',
  'terminee',
  'annulee',
] as const;

export const TYPES_CONTRAT = [
  'travail',
  'vacataire',
  'prestataire',
  'bail',
  'assurance',
  'maintenance',
  'autre',
] as const;

export class CreerActifDto {
  @IsString()
  @IsNotEmpty({ message: 'La désignation est obligatoire' })
  designation: string;

  // Batiment, salle, materiel_medical, materiel_informatique, mobilier,
  // vehicule, equipement, autre
  @IsOptional()
  @IsString()
  categorie?: string;

  @IsOptional()
  @IsString()
  localisation?: string;

  @IsOptional()
  @IsIn(ETATS_ACTIF as unknown as string[], { message: 'etat : valeur invalide' })
  etat?: string;

  // Format ISO "2024-05-12"
  @IsOptional()
  @IsString()
  dateAcquisition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valeurAcquisition?: number;

  // Amortissement lineaire : la valeur residuelle est toujours calculee,
  // jamais stockee.
  @IsOptional()
  @IsInt()
  @Min(1)
  dureeAmortAnnees?: number;

  @IsOptional()
  @IsString()
  fournisseur?: string;

  @IsOptional()
  @Matches(FORME_UUID, { message: 'affecteA : identifiant invalide' })
  affecteA?: string;

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
  @IsIn(ETATS_ACTIF as unknown as string[], { message: 'etat : valeur invalide' })
  etat?: string;

  @IsOptional()
  @IsString()
  dateAcquisition?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  valeurAcquisition?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  dureeAmortAnnees?: number;

  @IsOptional()
  @IsString()
  fournisseur?: string;

  @IsOptional()
  @Matches(FORME_UUID, { message: 'affecteA : identifiant invalide' })
  affecteA?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;
}

export class CreerInterventionDto {
  @IsOptional()
  @IsIn(TYPES_INTERVENTION as unknown as string[], {
    message: 'type : valeur invalide',
  })
  type?: string;

  @IsString()
  @IsNotEmpty({ message: 'La description est requise' })
  description: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cout?: number;

  // Format ISO "2026-08-08" (defaut : aujourd'hui)
  @IsOptional()
  @IsString()
  date?: string;
}

export class ModifierInterventionDto {
  @IsOptional()
  @IsIn(STATUTS_INTERVENTION as unknown as string[], {
    message: 'statut : valeur invalide',
  })
  statut?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  cout?: number;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La description ne peut pas être vide' })
  description?: string;
}

export class CreerContratDto {
  @IsOptional()
  @IsIn(TYPES_CONTRAT as unknown as string[], { message: 'type : valeur invalide' })
  type?: string;

  @IsString()
  @IsNotEmpty({ message: "L'objet du contrat est requis" })
  objet: string;

  @IsOptional()
  @IsString()
  cocontractant?: string;

  @IsOptional()
  @Matches(FORME_UUID, { message: 'personnelId : identifiant invalide' })
  personnelId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  dateDebut?: string;

  @IsOptional()
  @IsString()
  dateFin?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montant?: number;

  @IsOptional()
  @IsString()
  note?: string;
}

export class ModifierContratDto {
  @IsOptional()
  @IsIn(TYPES_CONTRAT as unknown as string[], { message: 'type : valeur invalide' })
  type?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: "L'objet ne peut pas être vide" })
  objet?: string;

  @IsOptional()
  @IsString()
  cocontractant?: string;

  @IsOptional()
  @Matches(FORME_UUID, { message: 'personnelId : identifiant invalide' })
  personnelId?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  dateDebut?: string;

  @IsOptional()
  @IsString()
  dateFin?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  montant?: number;

  @IsOptional()
  @IsString()
  note?: string;

  @IsOptional()
  @IsBoolean()
  resilie?: boolean;
}
