import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreerMaDemandeDto } from './espace.dto';

// Jours ouvrables lundi-vendredi, dates incluses (meme calcul que Conges).
function compterJoursOuvrables(debut: string, fin: string): number {
  const d1 = new Date(debut + 'T00:00:00Z');
  const d2 = new Date(fin + 'T00:00:00Z');
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()) || d2 < d1) {
    return 0;
  }
  let n = 0;
  const cur = new Date(d1);
  while (cur <= d2) {
    const j = cur.getUTCDay();
    if (j !== 0 && j !== 6) n++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return n;
}

const PERSONNEL_BULLETIN = {
  select: {
    nom: true,
    prenom: true,
    fonction: true,
    matricule: true,
    service: true,
    typeContrat: true,
    dateEmbauche: true,
    numeroCnps: true,
    niu: true,
    situationFamille: true,
  },
};

// L'espace personnel : chaque utilisateur connecte ne voit QUE sa propre
// fiche, ses conges et ses bulletins. La fiche est retrouvee par le lien
// explicite (personnelId) ou, a defaut, par l'email de la fiche RH —
// le lien est alors memorise.
@Injectable()
export class EspaceService {
  constructor(private prisma: PrismaService) {}

  private async maFiche(hopitalId: string, user: Record<string, unknown>) {
    const utilisateurId = String(
      user['sub'] ?? user['id'] ?? user['utilisateurId'] ?? '',
    );
    if (!utilisateurId) return null;
    const utilisateur = await this.prisma.utilisateur.findFirst({
      where: { id: utilisateurId, hopitalId },
      select: { id: true, email: true, personnelId: true },
    });
    if (!utilisateur) return null;

    if (utilisateur.personnelId) {
      return this.prisma.personnel.findFirst({
        where: { id: utilisateur.personnelId, hopitalId },
      });
    }
    if (!utilisateur.email) return null;
    const parEmail = await this.prisma.personnel.findFirst({
      where: { hopitalId, email: utilisateur.email },
    });
    if (parEmail) {
      await this.prisma.utilisateur.update({
        where: { id: utilisateur.id },
        data: { personnelId: parEmail.id },
      });
    }
    return parEmail;
  }

  private async solde(hopitalId: string, personnelId: string, annee: number) {
    let params = await this.prisma.parametresConges.findUnique({
      where: { hopitalId },
    });
    if (!params) {
      params = await this.prisma.parametresConges.create({
        data: { hopitalId, joursAcquisAnnuel: 18 },
      });
    }
    const approuves = await this.prisma.demandeConge.aggregate({
      where: {
        hopitalId,
        personnelId,
        statut: 'approuve',
        type: 'annuel',
        dateDebut: {
          gte: new Date(`${annee}-01-01`),
          lt: new Date(`${annee + 1}-01-01`),
        },
      },
      _sum: { nbJoursOuvrables: true },
    });
    const pris = approuves._sum.nbJoursOuvrables ?? 0;
    return {
      annee,
      acquis: params.joursAcquisAnnuel,
      pris,
      restant: params.joursAcquisAnnuel - pris,
    };
  }

  // --------------------------------------------------------------------------
  // Vue d'ensemble
  // --------------------------------------------------------------------------
  async apercu(hopitalId: string, user: Record<string, unknown>) {
    const fiche = await this.maFiche(hopitalId, user);
    if (!fiche) return { lie: false };

    const annee = new Date().getFullYear();
    const solde = await this.solde(hopitalId, fiche.id, annee);
    const [enAttente, bulletins, dernier] = await Promise.all([
      this.prisma.demandeConge.count({
        where: { hopitalId, personnelId: fiche.id, statut: 'en_attente' },
      }),
      this.prisma.bulletinPaie.count({
        where: { hopitalId, personnelId: fiche.id },
      }),
      this.prisma.bulletinPaie.findFirst({
        where: { hopitalId, personnelId: fiche.id },
        orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
        select: { mois: true, annee: true, statutVersement: true },
      }),
    ]);

    return {
      lie: true,
      personnel: {
        nom: fiche.nom,
        prenom: fiche.prenom,
        fonction: fiche.fonction,
        service: fiche.service,
        matricule: fiche.matricule,
        dateEmbauche: fiche.dateEmbauche,
        typeContrat: fiche.typeContrat,
      },
      conges: { ...solde, enAttente },
      bulletins: { nb: bulletins, dernier },
    };
  }

  // --------------------------------------------------------------------------
  // Mes conges
  // --------------------------------------------------------------------------
  async mesConges(hopitalId: string, user: Record<string, unknown>) {
    const fiche = await this.maFiche(hopitalId, user);
    if (!fiche) throw new BadRequestException('Aucune fiche personnel liée');
    const annee = new Date().getFullYear();
    const [solde, demandes] = await Promise.all([
      this.solde(hopitalId, fiche.id, annee),
      this.prisma.demandeConge.findMany({
        where: { hopitalId, personnelId: fiche.id },
        include: {
          personnel: {
            select: { nom: true, prenom: true, fonction: true, matricule: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);
    return { solde, demandes };
  }

  async creerConge(
    hopitalId: string,
    user: Record<string, unknown>,
    dto: CreerMaDemandeDto,
  ) {
    const fiche = await this.maFiche(hopitalId, user);
    if (!fiche) throw new BadRequestException('Aucune fiche personnel liée');
    if (dto.dateFin < dto.dateDebut) {
      throw new BadRequestException('La date de fin précède la date de début');
    }
    const nbJours = compterJoursOuvrables(dto.dateDebut, dto.dateFin);
    if (nbJours === 0) {
      throw new BadRequestException(
        'La période ne contient aucun jour ouvrable',
      );
    }
    return this.prisma.demandeConge.create({
      data: {
        hopitalId,
        personnelId: fiche.id,
        type: dto.type ?? 'annuel',
        dateDebut: new Date(dto.dateDebut),
        dateFin: new Date(dto.dateFin),
        nbJoursOuvrables: nbJours,
        motif: dto.motif ?? null,
      },
      select: { id: true },
    });
  }

  // --------------------------------------------------------------------------
  // Mes bulletins (meme forme que le module Paie : le gabarit d'impression
  // du bulletin est reutilisable tel quel)
  // --------------------------------------------------------------------------
  async mesBulletins(
    hopitalId: string,
    user: Record<string, unknown>,
    annee?: number,
  ) {
    const fiche = await this.maFiche(hopitalId, user);
    if (!fiche) throw new BadRequestException('Aucune fiche personnel liée');
    const liste = await this.prisma.bulletinPaie.findMany({
      where: {
        hopitalId,
        personnelId: fiche.id,
        ...(annee ? { annee } : {}),
      },
      include: { personnel: PERSONNEL_BULLETIN },
      orderBy: [{ annee: 'desc' }, { mois: 'desc' }],
    });
    return liste.map((b) => ({
      ...b,
      salaireBase: Number(b.salaireBase),
      totalPrimes: Number(b.totalPrimes),
      brut: Number(b.brut),
      cnps: Number(b.cnps),
      irpp: Number(b.irpp),
      cac: Number(b.cac),
      autresRetenues: Number(b.autresRetenues),
      net: Number(b.net),
    }));
  }
}
