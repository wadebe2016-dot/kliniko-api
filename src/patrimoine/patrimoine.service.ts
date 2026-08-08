import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreerActifDto,
  CreerContratDto,
  CreerInterventionDto,
  ModifierActifDto,
  ModifierContratDto,
  ModifierInterventionDto,
} from './patrimoine.dto';

// Amortissement lineaire prorata temporis, plancher zero.
// Sans duree ou sans date d'acquisition : la residuelle vaut l'acquisition.
function valeurResiduelle(
  valeur: number | null,
  dureeAnnees: number | null,
  dateAcquisition: Date | null,
): number | null {
  if (valeur === null) return null;
  if (!dureeAnnees || dureeAnnees <= 0 || !dateAcquisition) return valeur;
  const jours = (Date.now() - dateAcquisition.getTime()) / 86400000;
  const part = Math.min(1, jours / (dureeAnnees * 365.25));
  return Math.max(0, Math.round(valeur * (1 - part)));
}

const AVEC_AFFECTE = {
  affecte: { select: { nom: true, prenom: true } },
};

@Injectable()
export class PatrimoineService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Inventaire : valeur residuelle TOUJOURS calculee, jamais stockee.
  // --------------------------------------------------------------------------
  async actifs(hopitalId: string, categorie?: string, etat?: string) {
    const actifs = await this.prisma.actif.findMany({
      where: {
        hopitalId,
        ...(categorie ? { categorie } : {}),
        ...(etat ? { etat: etat as never } : {}),
      },
      include: {
        ...AVEC_AFFECTE,
        _count: {
          select: {
            interventions: {
              where: { statut: { in: ['ouverte', 'en_cours'] } },
            },
          },
        },
      },
      orderBy: [{ actif: 'desc' }, { categorie: 'asc' }, { designation: 'asc' }],
    });
    return actifs.map((a) => this.presenterActif(a));
  }

  private presenterActif(a: {
    valeurAcquisition: unknown;
    dureeAmortAnnees: number | null;
    dateAcquisition: Date | null;
    _count?: { interventions: number };
    [cle: string]: unknown;
  }) {
    const valeur =
      a.valeurAcquisition !== null ? Number(a.valeurAcquisition) : null;
    const { _count, ...reste } = a;
    return {
      ...reste,
      valeurAcquisition: valeur,
      valeurResiduelle: valeurResiduelle(
        valeur,
        a.dureeAmortAnnees,
        a.dateAcquisition,
      ),
      interventionsOuvertes: _count ? _count.interventions : 0,
    };
  }

  // --------------------------------------------------------------------------
  // Detail d'un actif avec ses interventions
  // --------------------------------------------------------------------------
  async detail(hopitalId: string, actifId: string) {
    const a = await this.prisma.actif.findFirst({
      where: { id: actifId, hopitalId },
      include: {
        ...AVEC_AFFECTE,
        _count: {
          select: {
            interventions: {
              where: { statut: { in: ['ouverte', 'en_cours'] } },
            },
          },
        },
        interventions: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!a) throw new NotFoundException('Actif introuvable');
    const { interventions, ...actif } = a;
    return {
      ...this.presenterActif(actif),
      interventions: interventions.map((i) => ({
        ...i,
        cout: Number(i.cout),
      })),
    };
  }

  // --------------------------------------------------------------------------
  // Nouvel actif : code auto ACT-AAAA-NNNNNN
  // --------------------------------------------------------------------------
  async creer(hopitalId: string, dto: CreerActifDto) {
    await this.verifierAffectation(hopitalId, dto.affecteA);
    return this.prisma.$transaction(async (tx) => {
      const annee = new Date().getFullYear();
      const deja = await tx.actif.count({
        where: { hopitalId, code: { startsWith: `ACT-${annee}-` } },
      });
      const code = `ACT-${annee}-${String(deja + 1).padStart(6, '0')}`;
      return tx.actif.create({
        data: {
          hopitalId,
          code,
          designation: dto.designation,
          categorie: dto.categorie ?? 'equipement',
          localisation: dto.localisation ?? null,
          etat: (dto.etat ?? 'bon') as never,
          dateAcquisition: dto.dateAcquisition
            ? new Date(dto.dateAcquisition)
            : null,
          valeurAcquisition: dto.valeurAcquisition ?? null,
          dureeAmortAnnees: dto.dureeAmortAnnees ?? null,
          fournisseur: dto.fournisseur ?? null,
          affecteA: dto.affecteA ?? null,
          notes: dto.notes ?? null,
        },
        select: { id: true, code: true, designation: true },
      });
    });
  }

  // --------------------------------------------------------------------------
  // Modifier un actif (fiche complete, comme Edufo)
  // --------------------------------------------------------------------------
  async modifier(hopitalId: string, actifId: string, dto: ModifierActifDto) {
    await this.verifierActif(hopitalId, actifId);
    await this.verifierAffectation(hopitalId, dto.affecteA);
    return this.prisma.actif.update({
      where: { id: actifId },
      data: {
        designation: dto.designation ?? undefined,
        categorie: dto.categorie ?? undefined,
        localisation:
          dto.localisation !== undefined ? dto.localisation || null : undefined,
        etat: dto.etat ? (dto.etat as never) : undefined,
        dateAcquisition:
          dto.dateAcquisition !== undefined
            ? dto.dateAcquisition
              ? new Date(dto.dateAcquisition)
              : null
            : undefined,
        valeurAcquisition:
          dto.valeurAcquisition !== undefined ? dto.valeurAcquisition : undefined,
        dureeAmortAnnees:
          dto.dureeAmortAnnees !== undefined ? dto.dureeAmortAnnees : undefined,
        fournisseur:
          dto.fournisseur !== undefined ? dto.fournisseur || null : undefined,
        affecteA: dto.affecteA !== undefined ? dto.affecteA || null : undefined,
        notes: dto.notes !== undefined ? dto.notes || null : undefined,
        actif: dto.actif ?? undefined,
      },
      select: { id: true, designation: true },
    });
  }

  // --------------------------------------------------------------------------
  // Supprimer un actif : uniquement sans interventions (regle Edufo)
  // --------------------------------------------------------------------------
  async supprimerActif(hopitalId: string, actifId: string) {
    await this.verifierActif(hopitalId, actifId);
    const interventions = await this.prisma.interventionActif.count({
      where: { hopitalId, actifId },
    });
    if (interventions > 0) {
      throw new BadRequestException(
        "Impossible de supprimer : des interventions existent. Désactivez l'actif plutôt.",
      );
    }
    // L'ancien journal d'evenements referencait l'actif : on le purge d'abord.
    await this.prisma.$transaction([
      this.prisma.evenementActif.deleteMany({ where: { hopitalId, actifId } }),
      this.prisma.actif.delete({ where: { id: actifId } }),
    ]);
    return { id: actifId };
  }

  // --------------------------------------------------------------------------
  // Interventions : panne/reparation ouverte -> actif en reparation ;
  // derniere intervention cloturee -> retour a "bon".
  // --------------------------------------------------------------------------
  async creerIntervention(
    hopitalId: string,
    actifId: string,
    dto: CreerInterventionDto,
  ) {
    const actif = await this.verifierActif(hopitalId, actifId);
    const type = dto.type ?? 'panne';
    return this.prisma.$transaction(async (tx) => {
      const intervention = await tx.interventionActif.create({
        data: {
          hopitalId,
          actifId,
          type,
          description: dto.description,
          cout: dto.cout ?? 0,
          dateIntervention: dto.date ? new Date(dto.date) : undefined,
        },
        select: { id: true },
      });
      if (
        (type === 'panne' || type === 'reparation') &&
        actif.etat !== 'hors_service'
      ) {
        await tx.actif.update({
          where: { id: actifId },
          data: { etat: 'en_reparation' as never },
        });
      }
      return intervention;
    });
  }

  async modifierIntervention(
    hopitalId: string,
    interventionId: string,
    dto: ModifierInterventionDto,
  ) {
    const i = await this.prisma.interventionActif.findFirst({
      where: { id: interventionId, hopitalId },
      select: { id: true, actifId: true },
    });
    if (!i) throw new NotFoundException('Intervention introuvable');

    return this.prisma.$transaction(async (tx) => {
      await tx.interventionActif.update({
        where: { id: i.id },
        data: {
          statut: dto.statut ?? undefined,
          cout: dto.cout !== undefined ? dto.cout : undefined,
          description: dto.description ?? undefined,
        },
      });
      if (dto.statut === 'terminee' || dto.statut === 'annulee') {
        const restantes = await tx.interventionActif.count({
          where: {
            hopitalId,
            actifId: i.actifId,
            type: { in: ['panne', 'reparation'] },
            statut: { in: ['ouverte', 'en_cours'] },
          },
        });
        if (restantes === 0) {
          await tx.actif.updateMany({
            where: {
              id: i.actifId,
              hopitalId,
              etat: 'en_reparation' as never,
            },
            data: { etat: 'bon' as never },
          });
        }
      }
      return { id: i.id };
    });
  }

  async supprimerIntervention(hopitalId: string, interventionId: string) {
    const i = await this.prisma.interventionActif.findFirst({
      where: { id: interventionId, hopitalId },
      select: { id: true },
    });
    if (!i) throw new NotFoundException('Intervention introuvable');
    await this.prisma.interventionActif.delete({ where: { id: i.id } });
    return { id: i.id };
  }

  // --------------------------------------------------------------------------
  // Contrats : statut temporel TOUJOURS calcule a la lecture.
  // --------------------------------------------------------------------------
  async contrats(hopitalId: string, type?: string) {
    const contrats = await this.prisma.contrat.findMany({
      where: { hopitalId, ...(type ? { type } : {}) },
      include: { personnel: { select: { nom: true, prenom: true } } },
      orderBy: [{ resilie: 'asc' }, { dateFin: { sort: 'asc', nulls: 'last' } }],
    });
    const aujourdHui = new Date();
    aujourdHui.setHours(0, 0, 0, 0);
    return contrats.map((c) => {
      const joursRestants = c.dateFin
        ? Math.round((c.dateFin.getTime() - aujourdHui.getTime()) / 86400000)
        : null;
      const statutTemporel = c.resilie
        ? 'resilie'
        : c.dateDebut && c.dateDebut > aujourdHui
          ? 'a_venir'
          : joursRestants !== null && joursRestants < 0
            ? 'expire'
            : joursRestants !== null && joursRestants <= 60
              ? 'expire_bientot'
              : 'en_cours';
      return {
        ...c,
        montant: Number(c.montant),
        statutTemporel,
        joursRestants,
      };
    });
  }

  async creerContrat(hopitalId: string, dto: CreerContratDto) {
    await this.verifierPersonnel(hopitalId, dto.personnelId);
    return this.prisma.$transaction(async (tx) => {
      const annee = new Date().getFullYear();
      const deja = await tx.contrat.count({
        where: { hopitalId, reference: { startsWith: `CTR-${annee}-` } },
      });
      const reference =
        dto.reference || `CTR-${annee}-${String(deja + 1).padStart(6, '0')}`;
      return tx.contrat.create({
        data: {
          hopitalId,
          type: dto.type ?? 'prestataire',
          objet: dto.objet,
          cocontractant: dto.personnelId ? null : (dto.cocontractant ?? null),
          personnelId: dto.personnelId ?? null,
          reference,
          dateDebut: dto.dateDebut ? new Date(dto.dateDebut) : null,
          dateFin: dto.dateFin ? new Date(dto.dateFin) : null,
          montant: dto.montant ?? 0,
          note: dto.note ?? null,
        },
        select: { id: true, reference: true },
      });
    });
  }

  async modifierContrat(
    hopitalId: string,
    contratId: string,
    dto: ModifierContratDto,
  ) {
    const c = await this.prisma.contrat.findFirst({
      where: { id: contratId, hopitalId },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Contrat introuvable');
    await this.verifierPersonnel(hopitalId, dto.personnelId);
    return this.prisma.contrat.update({
      where: { id: c.id },
      data: {
        type: dto.type ?? undefined,
        objet: dto.objet ?? undefined,
        cocontractant:
          dto.cocontractant !== undefined || dto.personnelId
            ? dto.personnelId
              ? null
              : dto.cocontractant || null
            : undefined,
        personnelId:
          dto.personnelId !== undefined ? dto.personnelId || null : undefined,
        reference: dto.reference ?? undefined,
        dateDebut:
          dto.dateDebut !== undefined
            ? dto.dateDebut
              ? new Date(dto.dateDebut)
              : null
            : undefined,
        dateFin:
          dto.dateFin !== undefined
            ? dto.dateFin
              ? new Date(dto.dateFin)
              : null
            : undefined,
        montant: dto.montant !== undefined ? dto.montant : undefined,
        note: dto.note !== undefined ? dto.note || null : undefined,
        resilie: dto.resilie ?? undefined,
      },
      select: { id: true, reference: true },
    });
  }

  async supprimerContrat(hopitalId: string, contratId: string) {
    const c = await this.prisma.contrat.findFirst({
      where: { id: contratId, hopitalId },
      select: { id: true },
    });
    if (!c) throw new NotFoundException('Contrat introuvable');
    await this.prisma.contrat.delete({ where: { id: c.id } });
    return { id: c.id };
  }

  // --------------------------------------------------------------------------

  private async verifierActif(hopitalId: string, actifId: string) {
    const a = await this.prisma.actif.findFirst({
      where: { id: actifId, hopitalId },
      select: { id: true, etat: true },
    });
    if (!a) throw new NotFoundException('Actif introuvable');
    return a;
  }

  private async verifierAffectation(hopitalId: string, personnelId?: string) {
    if (!personnelId) return;
    const p = await this.prisma.personnel.findFirst({
      where: { id: personnelId, hopitalId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Membre du personnel introuvable');
  }

  private async verifierPersonnel(hopitalId: string, personnelId?: string) {
    return this.verifierAffectation(hopitalId, personnelId);
  }
}
