import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

// Champs de base (identite professionnelle, non sensibles)
export class CreerPersonnelDto {
  @IsString()
  @IsNotEmpty({ message: 'Le nom est obligatoire' })
  nom: string;

  @IsString()
  @IsNotEmpty({ message: 'La fonction est obligatoire' })
  fonction: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  service?: string;
}

export class ModifierPersonnelDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'Le nom ne peut pas être vide' })
  nom?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty({ message: 'La fonction ne peut pas être vide' })
  fonction?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  matricule?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  service?: string;

  @IsOptional()
  @IsIn(['actif', 'conge', 'suspendu', 'parti'], {
    message: 'statut : valeur invalide',
  })
  statut?: 'actif' | 'conge' | 'suspendu' | 'parti';
}

// Champs sensibles : permission personnel.rh uniquement
export class ModifierRhDto {
  @IsOptional()
  @IsString()
  dateNaissance?: string;

  @IsOptional()
  @IsIn(['M', 'F'], { message: 'sexe : valeur invalide' })
  sexe?: 'M' | 'F';

  @IsOptional()
  @IsString()
  adresse?: string;

  @IsOptional()
  @IsString()
  cni?: string;

  @IsOptional()
  @IsString()
  numeroCnps?: string;

  // Numero d'identifiant unique (contribuable)
  @IsOptional()
  @IsString()
  niu?: string;

  // Celibataire, Marie(e), Divorce(e), Veuf(ve)
  @IsOptional()
  @IsString()
  situationFamille?: string;

  // CDI, CDD, Vacataire, Stage...
  @IsOptional()
  @IsString()
  typeContrat?: string;

  @IsOptional()
  @IsString()
  dateEmbauche?: string;

  @IsOptional()
  @IsString()
  dateFinContrat?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  salaireBase?: number;

  @IsOptional()
  @IsString()
  diplome?: string;

  @IsOptional()
  @IsString()
  contactUrgenceNom?: string;

  @IsOptional()
  @IsString()
  contactUrgenceTel?: string;
}
