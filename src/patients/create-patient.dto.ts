@'
import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePatientDto {
  @IsUUID()
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
'@ | Set-Content -Encoding utf8 src\patients\dto\create-patient.dto.ts