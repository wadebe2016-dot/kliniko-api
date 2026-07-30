import { IsIn, IsOptional, IsString } from 'class-validator';

// hopitalId ne figure pas ici : il vient du jeton de l'utilisateur connecte.
export class CreateRendezVousDto {
  @IsString()
  patientId: string;

  // Date-heure ISO (ex : "2026-08-03T09:30:00Z")
  @IsString()
  debut: string;

  @IsOptional()
  @IsString()
  fin?: string;

  @IsOptional()
  @IsString()
  praticienId?: string;

  @IsOptional()
  @IsString()
  serviceId?: string;

  @IsOptional()
  @IsString()
  motif?: string;

  @IsOptional()
  @IsIn(['clinique', 'patient'])
  origine?: 'clinique' | 'patient';
}
