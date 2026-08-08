import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { Permissions } from '../auth/permissions.decorator';
import { PersonnelService } from './personnel.service';
import {
  CreerPersonnelDto,
  ModifierPersonnelDto,
  ModifierRhDto,
} from './personnel.dto';

@Controller('personnel')
export class PersonnelController {
  constructor(private readonly service: PersonnelService) {}

  @Get()
  @Permissions('personnel.lire')
  lister(@Req() req: any) {
    return this.service.lister(
      req.user.hopitalId,
      req.user.permissions ?? [],
    );
  }

  @Get(':id/rh')
  @Permissions('personnel.rh')
  ficheRh(@Req() req: any, @Param('id') id: string) {
    return this.service.ficheRh(req.user.hopitalId, id);
  }

  @Post()
  @Permissions('personnel.gerer')
  creer(@Req() req: any, @Body() dto: CreerPersonnelDto) {
    return this.service.creer(req.user.hopitalId, dto);
  }

  @Patch(':id')
  @Permissions('personnel.gerer')
  modifier(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierPersonnelDto,
  ) {
    return this.service.modifier(req.user.hopitalId, id, dto);
  }

  @Patch(':id/rh')
  @Permissions('personnel.rh')
  modifierRh(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ModifierRhDto,
  ) {
    return this.service.modifierRh(req.user.hopitalId, id, dto);
  }
}
