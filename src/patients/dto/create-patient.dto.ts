import { IsIn, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  hopitalId: string;

  @IsString()
  numeroDossier: string;

  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  prenom?: string;

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