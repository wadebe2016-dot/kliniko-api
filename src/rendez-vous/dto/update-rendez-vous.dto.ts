import { PartialType } from '@nestjs/mapped-types';
import { IsIn, IsOptional } from 'class-validator';
import { CreateRendezVousDto } from './create-rendez-vous.dto';

export class UpdateRendezVousDto extends PartialType(CreateRendezVousDto) {
  @IsOptional()
  @IsIn(['planifie', 'confirme', 'honore', 'annule', 'absent'])
  statut?: 'planifie' | 'confirme' | 'honore' | 'annule' | 'absent';
}
