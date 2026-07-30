import { IsOptional, IsString } from 'class-validator';

// On ne modifie que le contenu medical, pas le patient ni le rendez-vous.
export class UpdateConsultationDto {
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
