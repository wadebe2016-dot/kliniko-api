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

  // Format ISO "1990-05-14" — obligatoire : la clinique en a besoin
  @IsString()
  @IsNotEmpty({ message: 'La date de naissance est obligatoire' })
  dateNaissance: string;

  @IsIn(['M', 'F'], { message: 'Le sexe est obligatoire' })
  sexe: 'M' | 'F';
}
