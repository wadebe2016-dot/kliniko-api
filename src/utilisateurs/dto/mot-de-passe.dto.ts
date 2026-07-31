import { IsString, MinLength } from 'class-validator';

// Changement par l utilisateur lui-meme : l ancien mot de passe est exige.
export class ChangerMotDePasseDto {
  @IsString()
  ancienMotDePasse: string;

  @IsString()
  @MinLength(8, {
    message: 'Le nouveau mot de passe doit contenir au moins 8 caracteres',
  })
  nouveauMotDePasse: string;
}

// Reinitialisation par un administrateur : pas d ancien mot de passe.
export class ReinitialiserMotDePasseDto {
  @IsString()
  @MinLength(8, {
    message: 'Le mot de passe doit contenir au moins 8 caracteres',
  })
  motDePasse: string;
}
