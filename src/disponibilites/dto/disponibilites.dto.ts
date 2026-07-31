import {
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';

// Meme regle que pour les ordonnances : les identifiants de demonstration
// n'ont pas de numero de version, on verifie la forme sans exiger la version.
export const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const FORME_HEURE = /^([01]\d|2[0-3]):[0-5]\d$/;
const FORME_JOUR = /^\d{4}-\d{2}-\d{2}$/;

// Un horaire est une regle hebdomadaire : "le mardi, de 08:00 a 12:30,
// par creneaux de 30 minutes". Jour selon la norme ISO : 1 = lundi, 7 = dimanche.
export class CreerHoraireDto {
  @Matches(FORME_UUID, { message: 'praticienId : identifiant invalide' })
  praticienId: string;

  @IsInt()
  @Min(1)
  @Max(7)
  jourSemaine: number;

  @Matches(FORME_HEURE, { message: 'heureDebut : format attendu HH:MM' })
  heureDebut: string;

  @Matches(FORME_HEURE, { message: 'heureFin : format attendu HH:MM' })
  heureFin: string;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(240)
  dureeCreneau?: number;
}

export class CreerIndisponibiliteDto {
  // Absent = indisponibilite de toute la clinique (jour ferie, fermeture).
  @IsOptional()
  @Matches(FORME_UUID, { message: 'praticienId : identifiant invalide' })
  praticienId?: string;

  @IsString()
  debut: string;

  @IsString()
  fin: string;

  @IsOptional()
  @IsString()
  motif?: string;
}

export class FenetreDto {
  @Matches(FORME_JOUR, { message: 'du : format attendu AAAA-MM-JJ' })
  du: string;

  @Matches(FORME_JOUR, { message: 'au : format attendu AAAA-MM-JJ' })
  au: string;
}
