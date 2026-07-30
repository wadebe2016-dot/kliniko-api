import { IsIn, IsOptional, IsString } from 'class-validator';

// Note : hopitalId a disparu de ce DTO. La clinique est desormais
// determinee par le jeton de l'utilisateur connecte, jamais par le client.
export class CreatePatientDto {
  @IsString()
  numeroDossier: string;

  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  // Date au format ISO (ex : "1990-05-14")
  @IsOptional()
  @IsString()
  dateNaissance?: string;

  @IsOptional()
  @IsIn(['M', 'F'])
  sexe?: 'M' | 'F';

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsString()
  adresse?: string;
}
