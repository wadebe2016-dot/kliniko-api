import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreerDemandeDto,
  MajParametresCongesDto,
  StatuerDto,
} from './conges.dto';

// Compte les jours ouvrables (lundi-vendredi) entre deux dates incluses.
function compterJoursOuvrables(debut: string, fin: string): number {
  const d1 = new Date(debut + 'T00:00:00Z');
  const d2 = new Date(fin + 'T00:00:00Z');
  if (Number.isNaN(d1.getTime()) || Number.isNaN(d2.getTime()) || d2 < d1) {
    return 0;
  }
  let n = 0;
  const cur = new Date(d1);
  while (cur <= d2) {
    const j = cur.getUTCDay(); // 0 = dimanche, 6 = samedi
    if (j !== 0 && j !== 6) n++;
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return n;
}

const AVEC_PERSONNEL = {
  personnel: {
    select: { nom: true, prenom: true, fonction: true, matricule: true },
  },
};

@Injectable()
export class CongesService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Parametres (jours acquis par an, defaut 18)
  // --------------------------------------------------------------------------
  private async assurerParametres(hopitalId: string) {
    let p = await this.prisma.parametresConges.findUnique({
      where: { hopitalId },
    });
    if (!p) {
      p = await this.prisma.parametresConges.create({
        data: { hopitalId, joursAcquisAnnuel: 18 },
      });
    }
    return p;
  }

  async parametres(hopitalId: string) {
    const p = await this.assurerParametres(hopitalId);
    return { joursAcquisAnnuel: p.joursAcquisAnnuel };
  }

  async majParametres(hopitalId: string, dto: MajParametresCongesDto) {
    await this.assurerParametres(hopitalId);
    await this.prisma.parametresConges.update({
      where: { hopitalId },
      data: { joursAcquisAnnuel: dto.joursAcquisAnnuel },
    });
    return this.parametres(hopitalId);
  }

  // --------------------------------------------------------------------------
  // Demandes
  // --------------------------------------------------------------------------
  async liste(hopitalId: string, statut?: string) {
    return this.prisma.demandeConge.findMany({
      where: { hopitalId, ...(statut ? { statut } : {}) },
      include: AVEC_PERSONNEL,
      orderBy: { createdAt: 'desc' },
      take: 300,
    });
  }

  async creer(hopitalId: string, dto: CreerDemandeDto) {
    const emp = await this.prisma.personnel.findFirst({
      where: { id: dto.personnelId, hopitalId },
      select: { id: true },
    });
    if (!emp) throw new NotFoundException('Employé introuvable');
    if (dto.dateFin < dto.dateDebut) {
      throw new BadRequestException(
        'La date de fin précède la date de début',
      );
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
        personnelId: dto.personnelId,
        type: dto.type ?? 'annuel',
        dateDebut: new Date(dto.dateDebut),
        dateFin: new Date(dto.dateFin),
        nbJoursOuvrables: nbJours,
        motif: dto.motif ?? null,
      },
      include: AVEC_PERSONNEL,
    });
  }

  // Valider / refuser : uniquement une demande encore en attente
  async statuer(hopitalId: string, id: string, dto: StatuerDto) {
    const d = await this.prisma.demandeConge.findFirst({
      where: { id, hopitalId },
      select: { id: true, statut: true },
    });
    if (!d) throw new NotFoundException('Demande introuvable');
    if (d.statut !== 'en_attente') {
      throw new BadRequestException('Cette demande est déjà traitée');
    }
    return this.prisma.demandeConge.update({
      where: { id: d.id },
      data: {
        statut: dto.statut,
        commentaireValidation: dto.commentaire ?? null,
        valideLe: new Date(),
      },
      include: AVEC_PERSONNEL,
    });
  }

  async supprimer(hopitalId: string, id: string) {
    const d = await this.prisma.demandeConge.findFirst({
      where: { id, hopitalId },
      select: { id: true },
    });
    if (!d) throw new NotFoundException('Demande introuvable');
    await this.prisma.demandeConge.delete({ where: { id: d.id } });
    return { id: d.id };
  }

  // --------------------------------------------------------------------------
  // Soldes de l'annee : acquis - jours approuves (type annuel), par employe.
  // Toujours calcule, jamais stocke.
  // --------------------------------------------------------------------------
  async soldes(hopitalId: string, annee: number) {
    const p = await this.assurerParametres(hopitalId);
    const acquis = p.joursAcquisAnnuel;

    const actifs = await this.prisma.personnel.findMany({
      where: { hopitalId, statut: { in: ['actif', 'conge'] as never[] } },
      select: {
        id: true,
        nom: true,
        prenom: true,
        fonction: true,
        matricule: true,
      },
      orderBy: [{ nom: 'asc' }, { prenom: 'asc' }],
    });

    const approuves = await this.prisma.demandeConge.findMany({
      where: {
        hopitalId,
        statut: 'approuve',
        type: 'annuel',
        dateDebut: {
          gte: new Date(`${annee}-01-01`),
          lt: new Date(`${annee + 1}-01-01`),
        },
      },
      select: { personnelId: true, nbJoursOuvrables: true },
    });
    const prisPar = new Map<string, number>();
    for (const a of approuves) {
      prisPar.set(
        a.personnelId,
        (prisPar.get(a.personnelId) ?? 0) + a.nbJoursOuvrables,
      );
    }

    return {
      annee,
      joursAcquisAnnuel: acquis,
      soldes: actifs.map((e) => {
        const pris = prisPar.get(e.id) ?? 0;
        return {
          personnelId: e.id,
          nom: e.nom,
          prenom: e.prenom,
          fonction: e.fonction,
          matricule: e.matricule,
          acquis,
          pris,
          restant: acquis - pris,
        };
      }),
    };
  }
}
