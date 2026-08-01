import { IsIn, IsNotEmpty, IsOptional, IsString, Length } from 'class-validator';

export class DemanderCodeDto {
  @IsString()
  @IsNotEmpty()
  telephone: string;
}

export class VerifierCodeDto {
  @IsString()
  @IsNotEmpty()
  telephone: string;

  @IsString()
  @Length(6, 6, { message: 'Le code comporte 6 chiffres' })
  code: string;
}

export class ProfilDto {
  @IsString()
  @IsNotEmpty()
  nom: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  // Format ISO "1990-05-14"
  @IsOptional()
  @IsString()
  dateNaissance?: string;

  @IsOptional()
  @IsIn(['M', 'F'])
  sexe?: 'M' | 'F';
}
