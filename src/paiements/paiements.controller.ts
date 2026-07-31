import { Body, Controller, Param, Post, Req } from '@nestjs/common';
import { PaiementsService } from './paiements.service';
import { PaiementMobileDto } from './dto/paiement-mobile.dto';
import { Permissions } from '../auth/permissions.decorator';
import { Public } from '../auth/public.decorator';

@Controller('paiements')
export class PaiementsController {
  constructor(private readonly paiementsService: PaiementsService) {}

  // Notification Campay : route publique (aucun jeton).
  // Le contenu recu n est JAMAIS cru sur parole : il sert seulement de signal,
  // le statut reel est redemande a Campay dans verifier().
  @Public()
  @Post('campay/webhook')
  async webhook(@Body() body: any) {
    const reference = body?.reference;
    if (reference) {
      await this.paiementsService
        .verifier(null, String(reference))
        .catch((e) => console.error('Webhook Campay :', (e as Error).message));
    }
    return { recu: true };
  }

  // Demande de paiement envoyee au telephone du client
  @Post('mobile')
  @Permissions('facture.encaisser')
  demander(@Req() req: any, @Body() dto: PaiementMobileDto) {
    return this.paiementsService.demander(req.user.hopitalId, dto);
  }

  // Verification manuelle depuis la caisse
  @Post(':reference/verifier')
  @Permissions('facture.encaisser')
  verifier(@Req() req: any, @Param('reference') reference: string) {
    return this.paiementsService.verifier(req.user.hopitalId, reference);
  }
}
