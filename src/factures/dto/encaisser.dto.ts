import { IsIn, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class EncaisserDto {
  @IsNumber()
  @Min(1)
  montant: number;

  @IsIn(['especes', 'mobile_money'])
  moyen: 'especes' | 'mobile_money';

  // Requis en pratique pour mobile_money (integration Campay a venir)
  @IsOptional()
  @IsString()
  telephonePayeur?: string;
}
