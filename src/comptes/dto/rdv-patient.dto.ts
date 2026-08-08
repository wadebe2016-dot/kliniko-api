import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class DemanderRdvDto {
  @Matches(FORME_UUID, { message: 'cliniqueId : identifiant invalide' })
  cliniqueId: string;

  @Matches(FORME_UUID, { message: 'praticienId : identifiant invalide' })
  praticienId: string;

  // Instants ISO renvoyes par la route publique des creneaux
  @IsString()
  @IsNotEmpty()
  debut: string;

  @IsOptional()
  @IsString()
  fin?: string;

  @IsOptional()
  @IsString()
  motif?: string;

  // Prestation choisie dans la mercuriale publique de la clinique
  @Matches(FORME_UUID, { message: 'acteId : la prestation est obligatoire' })
  acteId: string;

  @IsIn(['momo', 'especes'], {
    message: 'modePaiement : Mobile Money ou especes sur place',
  })
  modePaiement: 'momo' | 'especes';

  // Prise en charge : assurance choisie parmi celles de la clinique
  @IsOptional()
  @Matches(FORME_UUID, { message: 'assuranceId : identifiant invalide' })
  assuranceId?: string;
}
