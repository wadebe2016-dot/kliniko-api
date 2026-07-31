import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { UtilisateursService } from './utilisateurs.service';
import { CreateUtilisateurDto } from './dto/create-utilisateur.dto';
import { UpdateUtilisateurDto } from './dto/update-utilisateur.dto';
import {
  ChangerMotDePasseDto,
  ReinitialiserMotDePasseDto,
} from './dto/mot-de-passe.dto';
import { Permissions } from '../auth/permissions.decorator';

@Controller('utilisateurs')
export class UtilisateursController {
  constructor(private readonly utilisateursService: UtilisateursService) {}

  // --- Routes personnelles : tout utilisateur connecte ---------------------
  // Declarees AVANT les routes ':id' pour que "moi" ne soit pas pris pour un id.

  @Post('moi/mot-de-passe')
  changerMonMotDePasse(@Req() req: any, @Body() dto: ChangerMotDePasseDto) {
    return this.utilisateursService.changerMonMotDePasse(req.user.sub, dto);
  }

  // --- Administration : exige la permission utilisateur.gerer -------------

  @Get('roles')
  @Permissions('utilisateur.gerer')
  listerRoles(@Req() req: any) {
    return this.utilisateursService.listerRoles(req.user.hopitalId);
  }

  @Get()
  @Permissions('utilisateur.gerer')
  findAll(@Req() req: any) {
    return this.utilisateursService.findAll(req.user.hopitalId);
  }

  @Post()
  @Permissions('utilisateur.gerer')
  create(@Req() req: any, @Body() dto: CreateUtilisateurDto) {
    return this.utilisateursService.create(req.user.hopitalId, dto);
  }

  @Patch(':id')
  @Permissions('utilisateur.gerer')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateUtilisateurDto,
  ) {
    return this.utilisateursService.update(
      req.user.hopitalId,
      id,
      req.user.sub,
      dto,
    );
  }

  @Post(':id/mot-de-passe')
  @Permissions('utilisateur.gerer')
  reinitialiserMotDePasse(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReinitialiserMotDePasseDto,
  ) {
    return this.utilisateursService.reinitialiserMotDePasse(
      req.user.hopitalId,
      id,
      dto,
    );
  }
}
