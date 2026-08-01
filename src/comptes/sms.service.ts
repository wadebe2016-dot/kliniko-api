import { Injectable, Logger } from '@nestjs/common';

// Envoi de SMS DEBRANCHABLE. Tant qu'aucun fournisseur n'est configure
// (variable SMS_PROVIDER absente), le message s'ecrit dans les journaux du
// serveur : toute la chaine se construit et se teste sans dependre du choix
// du fournisseur. Le jour venu, on ecrit ici l'adaptateur (Twilio, Infobip,
// MTN, Orange...) et rien d'autre ne change.
@Injectable()
export class SmsService {
  private readonly logger = new Logger('SMS');

  async envoyer(telephone: string, message: string): Promise<void> {
    const fournisseur = process.env.SMS_PROVIDER;
    if (!fournisseur) {
      this.logger.log(`[MODE DEV] vers ${telephone} : ${message}`);
      return;
    }
    // Adaptateurs reels a brancher ici selon SMS_PROVIDER.
    this.logger.error(`Fournisseur SMS inconnu : ${fournisseur}`);
    throw new Error('Fournisseur SMS non configure');
  }
}
