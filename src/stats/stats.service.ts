import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// Le tableau de bord ne montre a chacun que ce que ses permissions
// l'autorisent a voir : la caisse voit les finances, l'accueil voit
// l'agenda, l'administrateur voit tout.
@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  // Minuit ce matin, heure du Cameroun (UTC+1)
  private debutDuJour(): Date {
    const jour = new Date(Date.now() + 3600000).toISOString().slice(0, 10);
    return new Date(`${jour}T00:00:00+01:00`);
  }

  async tableauDeBord(hopitalId: string, permissions: string[]) {
    const peut = (p: string) => permissions.includes(p);
    const debut = this.debutDuJour();
    const fin = new Date(debut.getTime() + 86400000);
    const resultat: Record<string, unknown> = {};

    if (peut('patient.lire')) {
      resultat.patientsTotal = await this.prisma.patient.count({
        where: { hopitalId, deletedAt: null },
      });
    }

    if (peut('rdv.lire')) {
      resultat.rdvAujourdHui = await this.prisma.rendezVous.count({
        where: {
          hopitalId,
          deletedAt: null,
          statut: { in: ['planifie', 'confirme', 'honore'] },
          debut: { gte: debut, lt: fin },
        },
      });
      // Les demandes venues de l'application patient, en attente de reponse
      resultat.demandesEnAttente = await this.prisma.rendezVous.count({
        where: {
          hopitalId,
          deletedAt: null,
          origine: 'patient',
          statut: 'planifie',
        },
      });
      resultat.prochainsRdv = await this.prisma.rendezVous.findMany({
        where: {
          hopitalId,
          deletedAt: null,
          statut: { in: ['planifie', 'confirme'] },
          debut: { gte: new Date() },
        },
        orderBy: { debut: 'asc' },
        take: 6,
        select: {
          id: true,
          debut: true,
          statut: true,
          origine: true,
          motif: true,
          patient: { select: { nom: true, prenom: true, numeroDossier: true } },
          praticien: { select: { nom: true, prenom: true } },
        },
      });
    }

    if (peut('facture.lire')) {
      // Encaisse aujourd'hui : paiements retenus (especes, ou Mobile Money confirme)
      const paiementsDuJour = await this.prisma.paiement.findMany({
        where: {
          hopitalId,
          deletedAt: null,
          datePaiement: { gte: debut, lt: fin },
          OR: [{ campayStatut: null }, { campayStatut: 'SUCCESSFUL' }],
        },
        select: { montant: true },
      });
      resultat.encaisseAujourdHui = paiementsDuJour.reduce(
        (total, p) => total + Number(p.montant),
        0,
      );

      const ouvertes = await this.prisma.facture.findMany({
        where: {
          hopitalId,
          deletedAt: null,
          statut: { in: ['ouverte', 'partielle'] },
        },
        select: { montantTotal: true, montantPaye: true },
      });
      resultat.facturesOuvertes = ouvertes.length;
      resultat.montantImpaye = ouvertes.reduce(
        (total, f) => total + Number(f.montantTotal) - Number(f.montantPaye),
        0,
      );
    }

    if (peut('consultation.lire')) {
      resultat.consultationsAujourdHui = await this.prisma.consultation.count({
        where: {
          hopitalId,
          deletedAt: null,
          dateConsultation: { gte: debut, lt: fin },
        },
      });
    }

    return resultat;
  }
}
