import { Injectable } from '@nestjs/common';

// Client Campay (Mobile Money Cameroun).
// Meme contrat que la couche eprouvee d Edufo :
//   collect()        -> demande de paiement envoyee au telephone du client
//   getTransaction() -> statut reel de la transaction (source de verite)
// Configuration (.env) : CAMPAY_BASE_URL, CAMPAY_TOKEN
@Injectable()
export class CampayService {
  private get baseUrl(): string {
    return process.env.CAMPAY_BASE_URL || 'https://demo.campay.net';
  }

  private get token(): string {
    return process.env.CAMPAY_TOKEN || '';
  }

  private async appel(
    chemin: string,
    methode: 'GET' | 'POST',
    corps?: unknown,
  ): Promise<{ ok: boolean; data: any }> {
    const res = await fetch(`${this.baseUrl}${chemin}`, {
      method: methode,
      headers: {
        Authorization: `Token ${this.token}`,
        'Content-Type': 'application/json',
      },
      body: corps ? JSON.stringify(corps) : undefined,
    });
    const texte = await res.text();
    let data: any;
    try {
      data = texte ? JSON.parse(texte) : {};
    } catch {
      data = { raw: texte };
    }
    return { ok: res.ok, data };
  }

  // Envoie une demande de paiement sur le telephone du client
  async collect(entree: {
    montant: number;
    numero: string;
    description: string;
    externalReference: string;
  }): Promise<{
    ok: boolean;
    reference: string | null;
    operateur: string | null;
    ussdCode: string | null;
    raw: any;
  }> {
    const { ok, data } = await this.appel('/api/collect/', 'POST', {
      amount: String(entree.montant),
      currency: 'XAF',
      from: entree.numero,
      description: entree.description,
      external_reference: entree.externalReference,
    });
    return {
      ok: ok && !!data.reference,
      reference: data.reference || null,
      operateur: data.operator || null,
      ussdCode: data.ussd_code || null,
      raw: data,
    };
  }

  // Statut reel : PENDING | SUCCESSFUL | FAILED
  async getTransaction(reference: string): Promise<{
    ok: boolean;
    statut: string;
    operateur: string | null;
    raw: any;
  }> {
    const { ok, data } = await this.appel(
      `/api/transaction/${reference}/`,
      'GET',
    );
    return {
      ok,
      statut: String(data.status || '').toUpperCase(),
      operateur: data.operator || null,
      raw: data,
    };
  }
}
