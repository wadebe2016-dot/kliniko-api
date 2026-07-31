import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CampayService } from './campay.service';
import { PaiementMobileDto } from './dto/paiement-mobile.dto';

const FACTURE_COMPLETE = {
  patient: { select: { nom: true, prenom: true, numeroDossier: true } },
  lignes: true,
  paiements: { where: { deletedAt: null } },
};

@Injectable()
export class PaiementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campay: CampayService,
  ) {}

  // Campay attend un numero au format 237XXXXXXXXX
  private normaliserNumero(telephone: string): string {
    const chiffres = String(telephone || '').replace(/\D/g, '');
    if (chiffres.length === 9) return `237${chiffres}`;
    if (chiffres.length === 12 && chiffres.startsWith('237')) return chiffres;
    throw new BadRequestException(
      'Numero de telephone invalide (format attendu : 6XX XXX XXX)',
    );
  }

  // Demande de paiement : le client valide ensuite sur son telephone.
  // Le paiement est enregistre EN ATTENTE et ne compte pas encore.
  async demander(hopitalId: string, dto: PaiementMobileDto) {
    const facture = await this.prisma.facture.findUnique({
      where: { id: dto.factureId },
      include: { paiements: { where: { deletedAt: null } } },
    });
    if (!facture || facture.deletedAt || facture.hopitalId !== hopitalId) {
      throw new NotFoundException(`Facture ${dto.factureId} introuvable`);
    }
    if (facture.statut === 'annulee') {
      throw new BadRequestException('Cette facture est annulee');
    }
    if (facture.statut === 'reglee') {
      throw new BadRequestException('Cette facture est deja reglee');
    }

    const total = Number(facture.montantTotal);
    const paye = Number(facture.montantPaye);
    const enAttente = facture.paiements
      .filter((p) => p.campayStatut === 'PENDING')
      .reduce((somme, p) => somme + Number(p.montant), 0);
    const disponible = total - paye - enAttente;

    if (dto.montant > disponible) {
      throw new BadRequestException(
        enAttente > 0
          ? `Le montant (${dto.montant}) depasse le reste disponible (${disponible}), une demande de ${enAttente} est deja en attente`
          : `Le montant (${dto.montant}) depasse le reste a payer (${disponible})`,
      );
    }

    const numero = this.normaliserNumero(dto.telephone);

    // On enregistre d abord la tentative : son identifiant sert de reference
    // externe UNIQUE cote Campay. Avec une reference deja vue, Campay renvoie
    // l ancienne transaction au lieu d en creer une nouvelle.
    const paiement = await this.prisma.paiement.create({
      data: {
        hopitalId,
        factureId: facture.id,
        montant: dto.montant,
        moyen: 'mobile_money',
        telephonePayeur: numero,
        campayStatut: 'INITIE',
      },
    });

    let reponse;
    try {
      reponse = await this.campay.collect({
        montant: dto.montant,
        numero,
        description: `Kliniko facture ${facture.numero}`,
        externalReference: paiement.id,
      });
    } catch (e) {
      await this.prisma.paiement.delete({ where: { id: paiement.id } });
      console.error('Campay injoignable :', (e as Error).message);
      throw new ServiceUnavailableException(
        'Le service Mobile Money est injoignable',
      );
    }

    if (!reponse.ok || !reponse.reference) {
      await this.prisma.paiement.delete({ where: { id: paiement.id } });
      console.error('Campay collect refuse :', JSON.stringify(reponse.raw));
      throw new ServiceUnavailableException(
        "Le service Mobile Money n'a pas accepte la demande",
      );
    }

    await this.prisma.paiement.update({
      where: { id: paiement.id },
      data: {
        campayReference: reponse.reference,
        campayStatut: 'PENDING',
      },
    });

    return {
      paiementId: paiement.id,
      reference: reponse.reference,
      operateur: reponse.operateur,
      ussdCode: reponse.ussdCode,
      message:
        'Demande envoyee. Le client doit valider le paiement sur son telephone.',
    };
  }

  // Verification aupres de Campay (source de verite).
  // hopitalId null = appel interne depuis le webhook.
  async verifier(hopitalId: string | null, reference: string) {
    const paiement = await this.prisma.paiement.findFirst({
      where: { campayReference: reference, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!paiement) {
      throw new NotFoundException(`Paiement ${reference} introuvable`);
    }
    if (hopitalId && paiement.hopitalId !== hopitalId) {
      throw new NotFoundException(`Paiement ${reference} introuvable`);
    }

    const reponse = await this.campay.getTransaction(reference);
    if (!reponse.ok) {
      throw new ServiceUnavailableException(
        "Impossible de joindre le service Mobile Money pour l'instant",
      );
    }
    const statut = reponse.statut || 'PENDING';

    return this.prisma.$transaction(async (tx) => {
      await tx.paiement.update({
        where: { id: paiement.id },
        data: { campayStatut: statut },
      });

      // Recalcul complet : especes (sans statut) + mobile money confirme
      const tous = await tx.paiement.findMany({
        where: { factureId: paiement.factureId, deletedAt: null },
      });
      const somme = tous
        .filter(
          (p) => p.campayStatut === null || p.campayStatut === 'SUCCESSFUL',
        )
        .reduce((total, p) => total + Number(p.montant), 0);

      const facture = await tx.facture.findUnique({
        where: { id: paiement.factureId },
      });
      const total = Number(facture?.montantTotal ?? 0);
      const nouveauStatut =
        somme <= 0 ? 'ouverte' : somme >= total ? 'reglee' : 'partielle';

      const maj = await tx.facture.update({
        where: { id: paiement.factureId },
        data: { montantPaye: somme, statut: nouveauStatut },
        include: FACTURE_COMPLETE,
      });

      return { statutPaiement: statut, facture: maj };
    });
  }
}
