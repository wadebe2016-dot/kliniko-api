import { IsOptional, IsString } from 'class-validator';

// hopitalId et praticienId ne figurent pas ici : la clinique vient du jeton,
// et le praticien est retrouve a partir de l'utilisateur connecte.
export class CreateConsultationDto {
  @IsString()
  patientId: string;

  // Si fourni, le rendez-vous passera automatiquement au statut "honore"
  @IsOptional()
  @IsString()
  rendezVousId?: string;

  @IsOptional()
  @IsString()
  motif?: string;

  @IsOptional()
  @IsString()
  observations?: string;

  @IsOptional()
  @IsString()
  diagnostic?: string;
}
