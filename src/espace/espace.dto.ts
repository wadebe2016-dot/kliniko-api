import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreerMaDemandeDto {
  @IsOptional()
  @IsIn(['annuel', 'maladie', 'maternite', 'exceptionnel', 'sans_solde'], {
    message: 'type : valeur invalide',
  })
  type?: string;

  @IsString()
  @IsNotEmpty({ message: 'La date de début est requise' })
  dateDebut: string;

  @IsString()
  @IsNotEmpty({ message: 'La date de fin est requise' })
  dateFin: string;

  @IsOptional()
  @IsString()
  motif?: string;
}
