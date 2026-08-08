import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PatrimoineService } from './patrimoine.service';
import {
  ChangerEtatDto,
  CreerActifDto,
  ModifierActifDto,
} from './patrimoine.dto';

@Controller('patrimoine')
export class PatrimoineController {
  constructor(private readonly service: PatrimoineService) {}

  @Get('actifs')
  @Permissions('patrimoine.lire')
  actifs(@Req() req: any) {
    return this.service.actifs(req.user.hopitalId);
  }

  @Get('evenements')
  @Permissions('patrimoine.lire')
  evenements(@Req() req: any, @Query('actifId') actifId?: string) {
    return this.service.evenements(req.user.hopitalId, actifId);
  }

  @Post('actifs')
  @Permissions('patrimoine.gerer')
  creer(@Req() req: any, @Body() dto: CreerActifDto) {
    return this.service.creer(req.user.hopitalId, dto);
  }

  @Patch('actifs/:id')
  @Permissions('patrimoine.gerer')
  modifier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierActifDto,
  ) {
    return this.service.modifier(req.user.hopitalId, id, dto);
  }

  @Post('actifs/:id/etat')
  @Permissions('patrimoine.gerer')
  changerEtat(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ChangerEtatDto,
  ) {
    return this.service.changerEtat(req.user.hopitalId, id, dto);
  }
}
