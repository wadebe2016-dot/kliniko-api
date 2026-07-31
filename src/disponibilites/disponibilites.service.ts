import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreerHoraireDto,
  CreerIndisponibiliteDto,
} from './dto/disponibilites.dto';

// Le Cameroun vit a UTC+1 toute l'annee, sans heure d'ete. Les horaires sont
// des regles en heure locale ("08:00") ; la conversion en instant reel se fait
// ici, explicitement, avec le decalage +01:00.
const DECALAGE = '+01:00';
const FENETRE_MAX_JOURS = 42;
const DUREE_RDV_PAR_DEFAUT_MIN = 30;

export type Creneau = { debut: string; fin: string; heure: string };

function chevauche(aDebut: Date, aFin: Date, bDebut: Date, bFin: Date) {
  return aDebut < bFin && bDebut < aFin;
}

// "2026-08-03" + "08:00" -> instant reel de 08:00 heure du Cameroun
function instant(jour: string, heure: string): Date {
  return new Date(`${jour}T${heure}:00${DECALAGE}`);
}

// Jour de semaine ISO (1 = lundi ... 7 = dimanche) d'une date "AAAA-MM-JJ"
function jourIso(jour: string): number {
  const d = new Date(`${jour}T12:00:00${DECALAGE}`).getUTCDay();
  return d === 0 ? 7 : d;
}

function jourSuivant(jour: string): string {
  const d = new Date(`${jour}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

@Injectable()
export class DisponibilitesService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Horaires de travail
  // --------------------------------------------------------------------------
  listerHoraires(hopitalId: string, praticienId?: string) {
    return this.prisma.horaireTravail.findMany({
      where: {
        hopitalId,
        deletedAt: null,
        actif: true,
        ...(praticienId ? { praticienId } : {}),
      },
      select: {
        id: true,
        praticienId: true,
        jourSemaine: true,
        heureDebut: true,
        heureFin: true,
        dureeCreneau: true,
        praticien: { select: { nom: true, prenom: true } },
      },
      orderBy: [{ praticienId: 'asc' }, { jourSemaine: 'asc' }, { heureDebut: 'asc' }],
    });
  }

  async creerHoraire(hopitalId: string, dto: CreerHoraireDto) {
    const praticien = await this.prisma.praticien.findFirst({
      where: { id: dto.praticienId, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!praticien) throw new NotFoundException('Praticien introuvable');
    if (dto.heureDebut >= dto.heureFin) {
      throw new BadRequestException(
        "L'heure de debut doit preceder l'heure de fin",
      );
    }

    // Deux plages du meme jour ne doivent pas se chevaucher
    const memesJours = await this.prisma.horaireTravail.findMany({
      where: {
        hopitalId,
        praticienId: dto.praticienId,
        jourSemaine: dto.jourSemaine,
        deletedAt: null,
        actif: true,
      },
      select: { heureDebut: true, heureFin: true },
    });
    const conflit = memesJours.find(
      (h) => dto.heureDebut < h.heureFin && h.heureDebut < dto.heureFin,
    );
    if (conflit) {
      throw new BadRequestException(
        `Chevauchement avec la plage ${conflit.heureDebut}-${conflit.heureFin} du meme jour`,
      );
    }

    return this.prisma.horaireTravail.create({
      data: {
        hopitalId,
        praticienId: dto.praticienId,
        jourSemaine: dto.jourSemaine,
        heureDebut: dto.heureDebut,
        heureFin: dto.heureFin,
        dureeCreneau: dto.dureeCreneau ?? DUREE_RDV_PAR_DEFAUT_MIN,
      },
      select: { id: true, jourSemaine: true, heureDebut: true, heureFin: true },
    });
  }

  async supprimerHoraire(hopitalId: string, id: string) {
    const existant = await this.prisma.horaireTravail.findFirst({
      where: { id, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!existant) throw new NotFoundException('Horaire introuvable');
    await this.prisma.horaireTravail.update({
      where: { id },
      data: { deletedAt: new Date(), actif: false },
    });
    return { supprime: true };
  }

  // --------------------------------------------------------------------------
  // Indisponibilites (conges, absences, fermetures)
  // --------------------------------------------------------------------------
  listerIndisponibilites(hopitalId: string, praticienId?: string) {
    return this.prisma.indisponibilite.findMany({
      where: {
        hopitalId,
        deletedAt: null,
        fin: { gte: new Date() },
        // Celles du praticien demande ET celles de toute la clinique
        ...(praticienId
          ? { OR: [{ praticienId }, { praticienId: null }] }
          : {}),
      },
      select: {
        id: true,
        praticienId: true,
        debut: true,
        fin: true,
        motif: true,
        praticien: { select: { nom: true, prenom: true } },
      },
      orderBy: { debut: 'asc' },
    });
  }

  async creerIndisponibilite(hopitalId: string, dto: CreerIndisponibiliteDto) {
    const debut = new Date(dto.debut);
    const fin = new Date(dto.fin);
    if (isNaN(debut.getTime()) || isNaN(fin.getTime())) {
      throw new BadRequestException('Dates invalides');
    }
    if (debut >= fin) {
      throw new BadRequestException('Le debut doit preceder la fin');
    }
    if (dto.praticienId) {
      const praticien = await this.prisma.praticien.findFirst({
        where: { id: dto.praticienId, hopitalId, deletedAt: null },
        select: { id: true },
      });
      if (!praticien) throw new NotFoundException('Praticien introuvable');
    }
    return this.prisma.indisponibilite.create({
      data: {
        hopitalId,
        praticienId: dto.praticienId ?? null,
        debut,
        fin,
        motif: dto.motif ?? null,
      },
      select: { id: true, debut: true, fin: true, motif: true },
    });
  }

  async supprimerIndisponibilite(hopitalId: string, id: string) {
    const existante = await this.prisma.indisponibilite.findFirst({
      where: { id, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!existante) throw new NotFoundException('Indisponibilite introuvable');
    await this.prisma.indisponibilite.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
    return { supprime: true };
  }

  // --------------------------------------------------------------------------
  // Le calcul des creneaux libres
  // --------------------------------------------------------------------------
  async calculerCreneaux(
    hopitalId: string,
    praticienId: string,
    du: string,
    au: string,
  ): Promise<{ jours: { date: string; creneaux: Creneau[] }[] }> {
    const praticien = await this.prisma.praticien.findFirst({
      where: { id: praticienId, hopitalId, deletedAt: null },
      select: { id: true },
    });
    if (!praticien) throw new NotFoundException('Praticien introuvable');

    const debutFenetre = instant(du, '00:00');
    const finFenetre = instant(au, '23:59');
    if (isNaN(debutFenetre.getTime()) || isNaN(finFenetre.getTime())) {
      throw new BadRequestException('Fenetre invalide');
    }
    const jours =
      (finFenetre.getTime() - debutFenetre.getTime()) / 86400000;
    if (jours < 0 || jours > FENETRE_MAX_JOURS) {
      throw new BadRequestException(
        `La fenetre doit tenir entre 1 et ${FENETRE_MAX_JOURS} jours`,
      );
    }

    const [horaires, indispos, rdvs] = await Promise.all([
      this.prisma.horaireTravail.findMany({
        where: { hopitalId, praticienId, deletedAt: null, actif: true },
        select: {
          jourSemaine: true,
          heureDebut: true,
          heureFin: true,
          dureeCreneau: true,
        },
      }),
      this.prisma.indisponibilite.findMany({
        where: {
          hopitalId,
          deletedAt: null,
          OR: [{ praticienId }, { praticienId: null }],
          debut: { lt: finFenetre },
          fin: { gt: debutFenetre },
        },
        select: { debut: true, fin: true },
      }),
      this.prisma.rendezVous.findMany({
        where: {
          hopitalId,
          praticienId,
          deletedAt: null,
          statut: { in: ['planifie', 'confirme', 'honore'] },
          debut: { lt: finFenetre },
        },
        select: { debut: true, fin: true },
      }),
    ]);

    const occupations = rdvs.map((r) => ({
      debut: r.debut,
      fin: r.fin ?? new Date(r.debut.getTime() + DUREE_RDV_PAR_DEFAUT_MIN * 60000),
    }));
    const maintenant = new Date();
    const resultat: { date: string; creneaux: Creneau[] }[] = [];

    for (let j = du; j <= au; j = jourSuivant(j)) {
      const iso = jourIso(j);
      const plages = horaires.filter((h) => h.jourSemaine === iso);
      const creneaux: Creneau[] = [];

      for (const plage of plages) {
        const pas = plage.dureeCreneau * 60000;
        const finPlage = instant(j, plage.heureFin);
        for (
          let t = instant(j, plage.heureDebut);
          t.getTime() + pas <= finPlage.getTime();
          t = new Date(t.getTime() + pas)
        ) {
          const finCreneau = new Date(t.getTime() + pas);
          if (t <= maintenant) continue;
          if (indispos.some((x) => chevauche(t, finCreneau, x.debut, x.fin)))
            continue;
          if (
            occupations.some((x) => chevauche(t, finCreneau, x.debut, x.fin))
          )
            continue;
          creneaux.push({
            debut: t.toISOString(),
            fin: finCreneau.toISOString(),
            heure: t
              .toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Africa/Douala',
              })
              .replace(':', 'h'),
          });
        }
      }
      creneaux.sort((a, b) => a.debut.localeCompare(b.debut));
      resultat.push({ date: j, creneaux });
    }

    return { jours: resultat };
  }

  // --------------------------------------------------------------------------
  // Detection de conflit, a l'usage du module rendez-vous
  // --------------------------------------------------------------------------
  async verifierConflit(
    hopitalId: string,
    praticienId: string,
    debut: Date,
    fin: Date | null,
    rendezVousIgnore?: string,
  ): Promise<string | null> {
    const finReelle =
      fin ?? new Date(debut.getTime() + DUREE_RDV_PAR_DEFAUT_MIN * 60000);

    // Chevauchement : l'autre commence avant notre fin ET finit apres notre
    // debut. Un rendez-vous sans fin declaree est repute durer la duree par
    // defaut, d'ou la seconde branche du OR.
    const rdv = await this.prisma.rendezVous.findFirst({
      where: {
        hopitalId,
        praticienId,
        deletedAt: null,
        statut: { in: ['planifie', 'confirme', 'honore'] },
        ...(rendezVousIgnore ? { id: { not: rendezVousIgnore } } : {}),
        debut: { lt: finReelle },
        OR: [
          { fin: { gt: debut } },
          {
            fin: null,
            debut: {
              gt: new Date(
                debut.getTime() - DUREE_RDV_PAR_DEFAUT_MIN * 60000,
              ),
            },
          },
        ],
      },
      select: { debut: true, fin: true },
    });
    if (rdv) {
      const finRdv =
        rdv.fin ??
        new Date(rdv.debut.getTime() + DUREE_RDV_PAR_DEFAUT_MIN * 60000);
      return `Le praticien a deja un rendez-vous de ${rdv.debut.toISOString()} a ${finRdv.toISOString()}`;
    }

    const indispo = await this.prisma.indisponibilite.findFirst({
      where: {
        hopitalId,
        deletedAt: null,
        OR: [{ praticienId }, { praticienId: null }],
        debut: { lt: finReelle },
        fin: { gt: debut },
      },
      select: { motif: true },
    });
    if (indispo) {
      return `Le praticien ou la clinique est indisponible sur ce creneau${indispo.motif ? ` (${indispo.motif})` : ''}`;
    }

    return null;
  }
}