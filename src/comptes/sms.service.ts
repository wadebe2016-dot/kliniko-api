import { Injectable, Logger } from '@nestjs/common';

// Envoi de messages aux patients et aux cliniques.
// Ordre d'essai :
//   1. WhatsApp Cloud API, si WHATSAPP_PHONE_ID et WHATSAPP_TOKEN sont
//      definis dans le .env. En mode test Meta, le destinataire doit etre
//      declare dans la console ET avoir ecrit une fois au numero de test
//      (ce qui ouvre la fenetre de 24 h autorisant le texte libre).
//   2. Sinon, ou en cas d'echec : le journal du serveur (mode dev).
// Un fournisseur SMS de secours s'ajoutera ici comme second essai.
@Injectable()
export class SmsService {
  private readonly logger = new Logger('Messages');

  async envoyer(telephone: string, message: string): Promise<void> {
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const jeton = process.env.WHATSAPP_TOKEN;

    if (phoneId && jeton) {
      try {
        const reponse = await fetch(
          `https://graph.facebook.com/v21.0/${phoneId}/messages`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${jeton}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: telephone,
              type: 'text',
              text: { body: message },
            }),
          },
        );
        if (reponse.ok) {
          this.logger.log(`WhatsApp envoye vers ${telephone}`);
          return;
        }
        this.logger.error(
          `WhatsApp refuse (${reponse.status}) : ${await reponse.text()}`,
        );
      } catch (e) {
        this.logger.error(`WhatsApp indisponible : ${(e as Error).message}`);
      }
    }

    // Repli : le journal du serveur tient lieu de canal en developpement.
    this.logger.log(`[MODE DEV] vers ${telephone} : ${message}`);
  }
}
