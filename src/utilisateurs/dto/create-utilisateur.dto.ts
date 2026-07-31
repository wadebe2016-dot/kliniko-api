import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';

// hopitalId ne figure pas ici : la clinique vient du jeton de l administrateur.
export class CreateUtilisateurDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caracteres',
  })
  motDePasse: string;

  @IsString()
  nom: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsArray()
  @ArrayNotEmpty({ message: 'Choisis au moins un role' })
  @IsString({ each: true })
  roleIds: string[];
}
