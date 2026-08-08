import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { ConsommablesService } from './consommables.service';
import {
  AjustementConsommableDto,
  CreerConsommableDto,
  EntreeConsommableDto,
  ModifierConsommableDto,
  SortieConsommableDto,
} from './dto/consommables.dto';

@Controller('consommables')
export class ConsommablesController {
  constructor(private readonly service: ConsommablesService) {}

  @Get('stock')
  @Permissions('consommable.lire')
  stock(@Req() req: any) {
    return this.service.etatStock(req.user.hopitalId);
  }

  @Get('mouvements')
  @Permissions('consommable.lire')
  mouvements(@Req() req: any, @Query('consommableId') consommableId?: string) {
    return this.service.mouvements(req.user.hopitalId, consommableId);
  }

  @Post()
  @Permissions('consommable.gerer')
  creer(@Req() req: any, @Body() dto: CreerConsommableDto) {
    return this.service.creer(req.user.hopitalId, dto);
  }

  @Put(':id')
  @Permissions('consommable.gerer')
  modifier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierConsommableDto,
  ) {
    return this.service.modifier(req.user.hopitalId, id, dto);
  }

  @Delete(':id')
  @Permissions('consommable.gerer')
  supprimerArticle(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimerArticle(req.user.hopitalId, id);
  }

  @Post('entrees')
  @Permissions('consommable.gerer')
  entree(@Req() req: any, @Body() dto: EntreeConsommableDto) {
    return this.service.entree(req.user.hopitalId, dto);
  }

  @Post('sorties')
  @Permissions('consommable.gerer')
  sortie(@Req() req: any, @Body() dto: SortieConsommableDto) {
    return this.service.sortie(req.user.hopitalId, dto);
  }

  @Post('ajustements')
  @Permissions('consommable.gerer')
  ajustement(@Req() req: any, @Body() dto: AjustementConsommableDto) {
    return this.service.ajustement(req.user.hopitalId, dto);
  }

  @Delete('mouvements/:id')
  @Permissions('consommable.gerer')
  supprimerMouvement(@Req() req: any, @Param('id') id: string) {
    return this.service.supprimerMouvement(req.user.hopitalId, id);
  }
}
