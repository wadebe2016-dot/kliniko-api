import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Matches,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export class LigneModifieeDto {
  @Matches(FORME_UUID, { message: 'ligneId : identifiant invalide' })
  ligneId: string;

  // 0 = retirer la ligne
  @IsInt()
  @Min(0)
  quantite: number;
}

export class ModifierLignesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LigneModifieeDto)
  lignes: LigneModifieeDto[];
}

export class AnnulerFactureDto {
  @IsString()
  @IsNotEmpty({ message: "L'annulation d'une facture exige un motif" })
  motif: string;
}
