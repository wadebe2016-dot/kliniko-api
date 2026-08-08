import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreerPersonnelDto,
  ModifierPersonnelDto,
  ModifierRhDto,
} from './personnel.dto';

// Champs de base : visibles de quiconque a personnel.lire
const CHAMPS_BASE = {
  id: true,
  matricule: true,
  nom: true,
  prenom: true,
  telephone: true,
  email: true,
  fonction: true,
  service: true,
  statut: true,
} as const;

@Injectable()
export class PersonnelService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Liste : fiche de base pour tous ; apercu RH (contrat, embauche, salaire)
  // uniquement si la permission personnel.rh est portee par le jeton.
  // --------------------------------------------------------------------------
  async lister(hopitalId: string, permissions: string[]) {
    const estRh = permissions.includes('personnel.rh');
    const liste = await this.prisma.personnel.findMany({
      where: { hopitalId },
      select: {
        ...CHAMPS_BASE,
        ...(estRh
          ? { typeContrat: true, dateEmbauche: true, salaireBase: true }
          : {}),
      },
      orderBy: [{ statut: 'asc' }, { nom: 'asc' }],
    });
    return liste.map((p) => ({
      ...p,
      ...('salaireBase' in p
        ? {
            salaireBase:
              (p as { salaireBase: unknown }).salaireBase !== null
                ? Number((p as { salaireBase: unknown }).salaireBase)
                : null,
          }
        : {}),
    }));
  }

  // --------------------------------------------------------------------------
  // Tableau de bord RH : effectif, masse salariale, repartitions,
  // contrats a echeance (60 jours). Permission personnel.rh.
  // --------------------------------------------------------------------------
  async tableauDeBord(hopitalId: string) {
    const tous = await this.prisma.personnel.findMany({
      where: { hopitalId },
      select: {
        nom: true,
        prenom: true,
        fonction: true,
        statut: true,
        sexe: true,
        typeContrat: true,
        dateFinContrat: true,
        salaireBase: true,
      },
    });
    const actifs = tous.filter((p) => p.statut !== 'parti');

    const masseSalariale = actifs.reduce(
      (s, p) => s + (p.salaireBase !== null ? Number(p.salaireBase) : 0),
      0,
    );

    const compteur = (cles: (string | null)[]) => {
      const m = new Map<string, number>();
      for (const c of cles) {
        const cle = c ?? 'Non défini';
        m.set(cle, (m.get(cle) ?? 0) + 1);
      }
      return [...m.entries()].map(([cle, nombre]) => ({ cle, nombre }));
    };

    const masseParFonction = new Map<string, number>();
    for (const p of actifs) {
      const salaire = p.salaireBase !== null ? Number(p.salaireBase) : 0;
      masseParFonction.set(
        p.fonction,
        (masseParFonction.get(p.fonction) ?? 0) + salaire,
      );
    }

    const horizon = new Date(Date.now() + 60 * 86400000);
    const contratsEcheance = actifs
      .filter(
        (p) =>
          p.dateFinContrat !== null &&
          p.dateFinContrat <= horizon,
      )
      .sort(
        (a, b) =>
          (a.dateFinContrat as Date).getTime() -
          (b.dateFinContrat as Date).getTime(),
      )
      .map((p) => ({
        nom: p.nom,
        prenom: p.prenom,
        fonction: p.fonction,
        typeContrat: p.typeContrat,
        dateFinContrat: p.dateFinContrat,
      }));

    return {
      effectif: actifs.length,
      masseSalariale,
      contratsEcheance,
      parContrat: compteur(actifs.map((p) => p.typeContrat)),
      parSexe: compteur(actifs.map((p) => p.sexe)),
      masseParFonction: [...masseParFonction.entries()]
        .map(([fonction, masse]) => ({ fonction, masse }))
        .sort((a, b) => b.masse - a.masse),
    };
  }

  // --------------------------------------------------------------------------
  // Fiche RH complete : permission personnel.rh
  // --------------------------------------------------------------------------
  async ficheRh(hopitalId: string, personnelId: string) {
    const p = await this.prisma.personnel.findFirst({
      where: { id: personnelId, hopitalId },
    });
    if (!p) throw new NotFoundException('Membre du personnel introuvable');
    return {
      ...p,
      salaireBase: p.salaireBase !== null ? Number(p.salaireBase) : null,
    };
  }

  // --------------------------------------------------------------------------
  // Creer une fiche (champs de base uniquement ; le RH complete ensuite)
  // --------------------------------------------------------------------------
  async creer(hopitalId: string, dto: CreerPersonnelDto) {
    if (dto.matricule) {
      const doublon = await this.prisma.personnel.findFirst({
        where: { hopitalId, matricule: dto.matricule },
        select: { id: true },
      });
      if (doublon) {
        throw new BadRequestException(
          `Le matricule ${dto.matricule} existe déjà`,
        );
      }
    }
    return this.prisma.personnel.create({
      data: {
        hopitalId,
        nom: dto.nom,
        fonction: dto.fonction,
        prenom: dto.prenom ?? null,
        matricule: dto.matricule ?? null,
        telephone: dto.telephone ?? null,
        email: dto.email ?? null,
        service: dto.service ?? null,
      },
      select: CHAMPS_BASE,
    });
  }

  // --------------------------------------------------------------------------
  // Modifier la fiche de base. Les champs sensibles ne passent JAMAIS ici.
  // --------------------------------------------------------------------------
  async modifier(
    hopitalId: string,
    personnelId: string,
    dto: ModifierPersonnelDto,
  ) {
    await this.verifier(hopitalId, personnelId);
    if (dto.matricule) {
      const doublon = await this.prisma.personnel.findFirst({
        where: { hopitalId, matricule: dto.matricule, id: { not: personnelId } },
        select: { id: true },
      });
      if (doublon) {
        throw new BadRequestException(
          `Le matricule ${dto.matricule} existe déjà`,
        );
      }
    }
    return this.prisma.personnel.update({
      where: { id: personnelId },
      data: {
        nom: dto.nom ?? undefined,
        fonction: dto.fonction ?? undefined,
        prenom: dto.prenom !== undefined ? dto.prenom || null : undefined,
        matricule:
          dto.matricule !== undefined ? dto.matricule || null : undefined,
        telephone:
          dto.telephone !== undefined ? dto.telephone || null : undefined,
        email: dto.email !== undefined ? dto.email || null : undefined,
        service: dto.service !== undefined ? dto.service || null : undefined,
        statut: dto.statut ?? undefined,
      },
      select: CHAMPS_BASE,
    });
  }

  // --------------------------------------------------------------------------
  // Modifier la fiche RH sensible : permission personnel.rh
  // --------------------------------------------------------------------------
  async modifierRh(hopitalId: string, personnelId: string, dto: ModifierRhDto) {
    await this.verifier(hopitalId, personnelId);
    return this.prisma.personnel.update({
      where: { id: personnelId },
      data: {
        dateNaissance:
          dto.dateNaissance !== undefined
            ? dto.dateNaissance
              ? new Date(dto.dateNaissance)
              : null
            : undefined,
        sexe: dto.sexe ?? undefined,
        adresse: dto.adresse !== undefined ? dto.adresse || null : undefined,
        cni: dto.cni !== undefined ? dto.cni || null : undefined,
        numeroCnps:
          dto.numeroCnps !== undefined ? dto.numeroCnps || null : undefined,
        typeContrat:
          dto.typeContrat !== undefined ? dto.typeContrat || null : undefined,
        dateEmbauche:
          dto.dateEmbauche !== undefined
            ? dto.dateEmbauche
              ? new Date(dto.dateEmbauche)
              : null
            : undefined,
        dateFinContrat:
          dto.dateFinContrat !== undefined
            ? dto.dateFinContrat
              ? new Date(dto.dateFinContrat)
              : null
            : undefined,
        salaireBase:
          dto.salaireBase !== undefined ? dto.salaireBase : undefined,
        diplome: dto.diplome !== undefined ? dto.diplome || null : undefined,
        contactUrgenceNom:
          dto.contactUrgenceNom !== undefined
            ? dto.contactUrgenceNom || null
            : undefined,
        contactUrgenceTel:
          dto.contactUrgenceTel !== undefined
            ? dto.contactUrgenceTel || null
            : undefined,
      },
      select: { id: true },
    });
  }

  private async verifier(hopitalId: string, personnelId: string) {
    const p = await this.prisma.personnel.findFirst({
      where: { id: personnelId, hopitalId },
      select: { id: true },
    });
    if (!p) throw new NotFoundException('Membre du personnel introuvable');
  }
}
