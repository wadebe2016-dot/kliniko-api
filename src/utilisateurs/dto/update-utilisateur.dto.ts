import { IsArray, IsBoolean, IsOptional, IsString } from 'class-validator';

// L email n est pas modifiable : c est l identifiant de connexion.
export class UpdateUtilisateurDto {
  @IsOptional()
  @IsString()
  nom?: string;

  @IsOptional()
  @IsString()
  prenom?: string;

  @IsOptional()
  @IsString()
  telephone?: string;

  @IsOptional()
  @IsBoolean()
  actif?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}
