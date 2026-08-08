import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  GenererBulletinDto,
  GenererTousDto,
  MajParametresDto,
  MajTranchesDto,
  SimulerDto,
  VersementDto,
  VersementLotDto,
} from './paie.dto';

// Valeurs camerounaises par defaut (a ajuster selon la loi de finances).
// Outil d'aide au calcul, NON certifie fiscalement.
const PAIE_DEFAUT = {
  tauxCnpsSalarial: 4.2,
  plafondCnps: 750000,
  abattementFraisPct: 30,
  cacPct: 10,
};
const IRPP_TRANCHES_DEFAUT = [
  { borneMin: 0, borneMax: 2000000, taux: 10, ordre: 1 },
  { borneMin: 2000000, borneMax: 3000000, taux: 15, ordre: 2 },
  { borneMin: 3000000, borneMax: 5000000, taux: 25, ordre: 3 },
  { borneMin: 5000000, borneMax: null, taux: 35, ordre: 4 },
];

const AVEC_PERSONNEL = {
  personnel: {
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
  },
};

type ParametresCalcul = {
  tauxCnpsSalarial: number;
  plafondCnps: number;
  abattementFraisPct: number;
  cacPct: number;
};
type TrancheCalcul = { borneMin: number; borneMax: number | null; taux: number };

// Moteur repris d'Edufo. Bareme IRPP saisi en ANNUEL : on annualise la
// base imposable mensuelle, on applique les tranches, on ramene au mois.
function calculPaie(
  brut: number,
  params: ParametresCalcul,
  tranches: TrancheCalcul[],
) {
  const assietteCnps =
    params.plafondCnps > 0 ? Math.min(brut, params.plafondCnps) : brut;
  const cnps = Math.round((assietteCnps * params.tauxCnpsSalarial) / 100);

  const apresCnps = brut - cnps;
  const baseImposableMensuelle = Math.max(
    0,
    apresCnps * (1 - params.abattementFraisPct / 100),
  );

  const baseAnnuelle = baseImposableMensuelle * 12;
  let irppAnnuel = 0;
  for (const tr of tranches) {
    const min = tr.borneMin;
    const max = tr.borneMax === null ? Infinity : tr.borneMax;
    if (baseAnnuelle > min) {
      const portion = Math.min(baseAnnuelle, max) - min;
      if (portion > 0) irppAnnuel += (portion * tr.taux) / 100;
    }
  }
  const irpp = Math.round(irppAnnuel / 12);
  const cac = Math.round((irpp * params.cacPct) / 100);

  return {
    cnps,
    irpp,
    cac,
    baseImposable: Math.round(baseImposableMensuelle),
  };
}

@Injectable()
export class PaieService {
  constructor(private prisma: PrismaService) {}

  // --------------------------------------------------------------------------
  // Parametres : crees avec les valeurs par defaut au premier acces
  // --------------------------------------------------------------------------
  private async assurerParametres(hopitalId: string) {
    let params = await this.prisma.parametresPaie.findUnique({
      where: { hopitalId },
    });
    if (!params) {
      params = await this.prisma.parametresPaie.create({
        data: { hopitalId, ...PAIE_DEFAUT },
      });
    }
    const nbTranches = await this.prisma.trancheIrpp.count({
      where: { hopitalId },
    });
    if (nbTranches === 0) {
      await this.prisma.trancheIrpp.createMany({
        data: IRPP_TRANCHES_DEFAUT.map((t) => ({ hopitalId, ...t })),
      });
    }
    return params;
  }

  private async chargerCalcul(hopitalId: string) {
    const brutParams = await this.assurerParametres(hopitalId);
    const brutTranches = await this.prisma.trancheIrpp.findMany({
      where: { hopitalId },
      orderBy: { ordre: 'asc' },
    });
    const params: ParametresCalcul = {
      tauxCnpsSalarial: Number(brutParams.tauxCnpsSalarial),
      plafondCnps: Number(brutParams.plafondCnps),
      abattementFraisPct: Number(brutParams.abattementFraisPct),
      cacPct: Number(brutParams.cacPct),
    };
    const tranches: TrancheCalcul[] = brutTranches.map((t) => ({
      borneMin: Number(t.borneMin),
      borneMax: t.borneMax === null ? null : Number(t.borneMax),
      taux: Number(t.taux),
    }));
    return { params, tranches };
  }

  async parametres(hopitalId: string) {
    const { params, tranches } = await this.chargerCalcul(hopitalId);
    return { parametres: params, tranches };
  }

  async majParametres(hopitalId: string, dto: MajParametresDto) {
    await this.assurerParametres(hopitalId);
    await this.prisma.parametresPaie.update({
      where: { hopitalId },
      data: {
        tauxCnpsSalarial: dto.tauxCnpsSalarial,
        plafondCnps: dto.plafondCnps,
        abattementFraisPct: dto.abattementFraisPct,
        cacPct: dto.cacPct,
      },
    });
    return this.parametres(hopitalId);
  }

  // Remplace l'integralite du bareme IRPP
  async majTranches(hopitalId: string, dto: MajTranchesDto) {
    if (dto.tranches.length === 0) {
      throw new BadRequestException('Au moins une tranche est requise');
    }
    const tranches = dto.tranches.map((t, i) => {
      const borneMin = Number(t.borneMin);
      const borneMax =
        t.borneMax === null || t.borneMax === undefined
          ? null
          : Number(t.borneMax);
      const taux = Number(t.taux);
      if (
        !Number.isFinite(borneMin) ||
        borneMin < 0 ||
        (borneMax !== null && (!Number.isFinite(borneMax) || borneMax < 0)) ||
        !Number.isFinite(taux) ||
        taux < 0 ||
        taux > 100
      ) {
        throw new BadRequestException(`Tranche ${i + 1} invalide`);
      }
      return { hopitalId, borneMin, borneMax, taux, ordre: i + 1 };
    });
    await this.prisma.$transaction([
      this.prisma.trancheIrpp.deleteMany({ where: { hopitalId } }),
      this.prisma.trancheIrpp.createMany({ data: tranches }),
    ]);
    return this.parametres(hopitalId);
  }

  // --------------------------------------------------------------------------
  // Apercu de calcul, sans enregistrer
  // --------------------------------------------------------------------------
  async simuler(hopitalId: string, dto: SimulerDto) {
    const { params, tranches } = await this.chargerCalcul(hopitalId);
    const brut = dto.salaireBase + (dto.totalPrimes ?? 0);
    const calc = calculPaie(brut, params, tranches);
    return { brut, ...calc, net: brut - calc.cnps - calc.irpp - calc.cac };
  }

  // --------------------------------------------------------------------------
  // Bulletins
  // --------------------------------------------------------------------------
  private presenterBulletin(b: { [cle: string]: unknown }) {
    const nombres = [
      'salaireBase',
      'totalPrimes',
      'brut',
      'cnps',
      'irpp',
      'cac',
      'autresRetenues',
      'net',
    ];
    const sortie: { [cle: string]: unknown } = { ...b };
    for (const cle of nombres) {
      if (sortie[cle] !== undefined && sortie[cle] !== null) {
        sortie[cle] = Number(sortie[cle]);
      }
    }
    return sortie;
  }

  async bulletins(hopitalId: string, mois?: number, annee?: number) {
    const liste = await this.prisma.bulletinPaie.findMany({
      where: {
        hopitalId,
        ...(mois ? { mois } : {}),
        ...(annee ? { annee } : {}),
      },
      include: AVEC_PERSONNEL,
      orderBy: [
        { personnel: { nom: 'asc' } },
        { personnel: { prenom: 'asc' } },
        { mois: 'asc' },
      ],
    });
    return liste.map((b) => this.presenterBulletin(b));
  }

  async detail(hopitalId: string, id: string) {
    const b = await this.prisma.bulletinPaie.findFirst({
      where: { id, hopitalId },
      include: AVEC_PERSONNEL,
    });
    if (!b) throw new NotFoundException('Bulletin introuvable');
    return this.presenterBulletin(b);
  }

  // Genere (ou regenere) le bulletin d'un employe pour un mois
  async generer(hopitalId: string, dto: GenererBulletinDto) {
    const emp = await this.prisma.personnel.findFirst({
      where: { id: dto.personnelId, hopitalId },
      select: { id: true, salaireBase: true },
    });
    if (!emp) throw new NotFoundException('Employé introuvable');
    const salaireBase = emp.salaireBase !== null ? Number(emp.salaireBase) : 0;

    const primes = (dto.primes ?? [])
      .map((p) => ({
        libelle: String(p.libelle ?? '').trim(),
        montant: Number(p.montant),
      }))
      .filter((p) => p.libelle && Number.isFinite(p.montant) && p.montant > 0);
    const totalPrimes = primes.reduce((s, p) => s + p.montant, 0);
    const brut = salaireBase + totalPrimes;

    const { params, tranches } = await this.chargerCalcul(hopitalId);
    const calc = calculPaie(brut, params, tranches);
    const net = brut - calc.cnps - calc.irpp - calc.cac;

    const bulletin = await this.prisma.bulletinPaie.upsert({
      where: {
        hopitalId_personnelId_mois_annee: {
          hopitalId,
          personnelId: dto.personnelId,
          mois: dto.mois,
          annee: dto.annee,
        },
      },
      create: {
        hopitalId,
        personnelId: dto.personnelId,
        mois: dto.mois,
        annee: dto.annee,
        salaireBase,
        totalPrimes,
        primesDetail: primes.length ? JSON.stringify(primes) : null,
        brut,
        cnps: calc.cnps,
        irpp: calc.irpp,
        cac: calc.cac,
        net,
      },
      update: {
        salaireBase,
        totalPrimes,
        primesDetail: primes.length ? JSON.stringify(primes) : null,
        brut,
        cnps: calc.cnps,
        irpp: calc.irpp,
        cac: calc.cac,
        net,
        genereLe: new Date(),
      },
      include: AVEC_PERSONNEL,
    });
    return this.presenterBulletin(bulletin);
  }

  // Genere en masse pour tout le personnel actif avec un salaire de base.
  // Ne touche jamais un bulletin deja verse.
  async genererTous(hopitalId: string, dto: GenererTousDto) {
    const { params, tranches } = await this.chargerCalcul(hopitalId);
    const staff = await this.prisma.personnel.findMany({
      where: { hopitalId, statut: 'actif' as never },
      select: { id: true, salaireBase: true },
    });
    const eligibles = staff.filter(
      (p) => p.salaireBase !== null && Number(p.salaireBase) > 0,
    );

    let generes = 0;
    let ignores = 0;
    for (const emp of eligibles) {
      const dejaPaye = await this.prisma.bulletinPaie.findFirst({
        where: {
          hopitalId,
          personnelId: emp.id,
          mois: dto.mois,
          annee: dto.annee,
          statutVersement: 'paye',
        },
        select: { id: true },
      });
      if (dejaPaye) {
        ignores++;
        continue;
      }
      const brut = Number(emp.salaireBase);
      const calc = calculPaie(brut, params, tranches);
      const net = brut - calc.cnps - calc.irpp - calc.cac;
      await this.prisma.bulletinPaie.upsert({
        where: {
          hopitalId_personnelId_mois_annee: {
            hopitalId,
            personnelId: emp.id,
            mois: dto.mois,
            annee: dto.annee,
          },
        },
        create: {
          hopitalId,
          personnelId: emp.id,
          mois: dto.mois,
          annee: dto.annee,
          salaireBase: brut,
          brut,
          cnps: calc.cnps,
          irpp: calc.irpp,
          cac: calc.cac,
          net,
        },
        update: {
          salaireBase: brut,
          totalPrimes: 0,
          primesDetail: null,
          brut,
          cnps: calc.cnps,
          irpp: calc.irpp,
          cac: calc.cac,
          net,
          genereLe: new Date(),
        },
      });
      generes++;
    }
    return { generes, ignores, total: eligibles.length };
  }

  async supprimer(hopitalId: string, id: string) {
    const b = await this.prisma.bulletinPaie.findFirst({
      where: { id, hopitalId },
      select: { id: true, statutVersement: true },
    });
    if (!b) throw new NotFoundException('Bulletin introuvable');
    if (b.statutVersement === 'paye') {
      throw new BadRequestException(
        'Ce bulletin est déjà versé : annulez le versement avant de le supprimer',
      );
    }
    await this.prisma.bulletinPaie.delete({ where: { id: b.id } });
    return { id: b.id };
  }

  // --------------------------------------------------------------------------
  // Versements
  // --------------------------------------------------------------------------
  async versement(hopitalId: string, id: string, dto: VersementDto) {
    const b = await this.prisma.bulletinPaie.findFirst({
      where: { id, hopitalId },
      select: { id: true },
    });
    if (!b) throw new NotFoundException('Bulletin introuvable');
    if (dto.statut === 'paye') {
      return this.prisma.bulletinPaie.update({
        where: { id: b.id },
        data: {
          statutVersement: 'paye',
          dateVersement: dto.dateVersement
            ? new Date(dto.dateVersement)
            : new Date(),
          modeVersement: dto.modeVersement ?? 'virement',
        },
        select: {
          id: true,
          statutVersement: true,
          dateVersement: true,
          modeVersement: true,
        },
      });
    }
    return this.prisma.bulletinPaie.update({
      where: { id: b.id },
      data: {
        statutVersement: 'en_attente',
        dateVersement: null,
        modeVersement: null,
      },
      select: {
        id: true,
        statutVersement: true,
        dateVersement: true,
        modeVersement: true,
      },
    });
  }

  async versementLot(hopitalId: string, dto: VersementLotDto) {
    const resultat = await this.prisma.bulletinPaie.updateMany({
      where: {
        hopitalId,
        mois: dto.mois,
        annee: dto.annee,
        statutVersement: { not: 'paye' },
      },
      data: {
        statutVersement: 'paye',
        dateVersement: dto.dateVersement
          ? new Date(dto.dateVersement)
          : new Date(),
        modeVersement: dto.modeVersement ?? 'virement',
      },
    });
    return { nbPayes: resultat.count };
  }

  // --------------------------------------------------------------------------
  // Livre de paie annuel : cumul par employe + detail mensuel
  // --------------------------------------------------------------------------
  async livreAnnuel(hopitalId: string, annee: number) {
    const detail = await this.bulletins(hopitalId, undefined, annee);

    const parEmploye = new Map<
      string,
      {
        personnelId: string;
        nom: string;
        prenom: string | null;
        fonction: string | null;
        matricule: string | null;
        nbBulletins: number;
        salaireBase: number;
        brut: number;
        cnps: number;
        irpp: number;
        cac: number;
        net: number;
      }
    >();
    for (const b of detail as {
      personnelId: string;
      personnel: {
        nom: string;
        prenom: string | null;
        fonction: string | null;
        matricule: string | null;
      };
      salaireBase: number;
      brut: number;
      cnps: number;
      irpp: number;
      cac: number;
      net: number;
    }[]) {
      const e = parEmploye.get(b.personnelId) ?? {
        personnelId: b.personnelId,
        nom: b.personnel.nom,
        prenom: b.personnel.prenom,
        fonction: b.personnel.fonction,
        matricule: b.personnel.matricule,
        nbBulletins: 0,
        salaireBase: 0,
        brut: 0,
        cnps: 0,
        irpp: 0,
        cac: 0,
        net: 0,
      };
      e.nbBulletins++;
      e.salaireBase += b.salaireBase;
      e.brut += b.brut;
      e.cnps += b.cnps;
      e.irpp += b.irpp;
      e.cac += b.cac;
      e.net += b.net;
      parEmploye.set(b.personnelId, e);
    }

    return {
      annee,
      cumul: [...parEmploye.values()].sort((a, b) =>
        `${a.nom} ${a.prenom ?? ''}`.localeCompare(`${b.nom} ${b.prenom ?? ''}`),
      ),
      detail,
    };
  }
}
