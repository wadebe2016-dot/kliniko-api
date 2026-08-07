import { Injectable, Logger } from '@nestjs/common';

// Envoi de messages aux patients et aux cliniques, en trois etages :
//  1. GABARIT approuve (template) : se livre A TOUT MOMENT, sans fenetre
//     de 24 h. C'est le canal des notifications.
//  2. Texte libre : ne se livre que dans la fenetre de 24 h suivant un
//     message du destinataire. Canal des codes tant que la verification
//     Meta Business n'a pas debloque la categorie authentification.
//  3. Journal du serveur : dernier repli, rien ne casse jamais.
@Injectable()
export class SmsService {
  private readonly logger = new Logger('Messages');

  private config() {
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const jeton = process.env.WHATSAPP_TOKEN;
    return phoneId && jeton ? { phoneId, jeton } : null;
  }

  private async posterWhatsApp(corps: object): Promise<boolean> {
    const cfg = this.config();
    if (!cfg) return false;
    try {
      const reponse = await fetch(
        `https://graph.facebook.com/v21.0/${cfg.phoneId}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cfg.jeton}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ messaging_product: 'whatsapp', ...corps }),
        },
      );
      if (reponse.ok) return true;
      this.logger.error(
        `WhatsApp refuse (${reponse.status}) : ${await reponse.text()}`,
      );
    } catch (e) {
      this.logger.error(`WhatsApp indisponible : ${(e as Error).message}`);
    }
    return false;
  }

  // Texte libre, avec repli journal.
  async envoyer(telephone: string, message: string): Promise<void> {
    if (
      await this.posterWhatsApp({
        to: telephone,
        type: 'text',
        text: { body: message },
      })
    ) {
      this.logger.log(`WhatsApp texte envoye vers ${telephone}`);
      return;
    }
    this.logger.log(`[MODE DEV] vers ${telephone} : ${message}`);
  }

  // Gabarit d'abord, texte libre ensuite, journal en dernier.
  async envoyerAvecGabarit(
    nomGabarit: string,
    parametres: string[],
    telephone: string,
    texteRepli: string,
  ): Promise<void> {
    const ok = await this.posterWhatsApp({
      to: telephone,
      type: 'template',
      template: {
        name: nomGabarit,
        language: { code: 'fr' },
        components: [
          {
            type: 'body',
            parameters: parametres.map((t) => ({ type: 'text', text: t })),
          },
        ],
      },
    });
    if (ok) {
      this.logger.log(`WhatsApp gabarit ${nomGabarit} envoye vers ${telephone}`);
      return;
    }
    await this.envoyer(telephone, texteRepli);
  }
}
