import { IsNumber, IsString, Min } from 'class-validator';

export class PaiementMobileDto {
  @IsString()
  factureId: string;

  @IsNumber()
  @Min(1)
  montant: number;

  // Accepte 6XXXXXXXX, 237XXXXXXXXX ou +237 XX XX XX XX
  @IsString()
  telephone: string;
}
