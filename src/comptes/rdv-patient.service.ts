import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisponibilitesService } from '../disponibilites/disponibilites.service';
import { DemanderRdvDto } from './dto/rdv-patient.dto';
import { SmsService } from './sms.service';

// Une demande sans reponse expire au bout de N heures et libere le creneau.
const EXPIRATION_DEMANDE_H = 6;
// Un compte ne peut pas saturer les agendas avec des demandes en attente.
const DEMANDES_EN_ATTENTE_MAX = 3;

// Ce que le patient voit de ses rendez-vous : le rendez-vous, la clinique,
// le praticien. RIEN du dossier medical.
const VUE_RDV = {
  id: true,
  debut: true,
  fin: true,
  statut: true,
  motif: true,
  motifRefus: true,
  expireA: true,
  hopital: { select: { id: true, nom: true, ville: true, telephone: true } },
  praticien: { select: { nom: true, prenom: true, specialite: true } },
  montantPrevu: true,
  modePaiement: true,
  acte: { select: { libelle: true } },
  assurance: { select: { nom: true } },
};

@Injectable()
export class RdvPatientService {
  constructor(
    private prisma: PrismaService,
    private disponibilites: DisponibilitesService,
    private sms: SmsService,
  ) {}

  // Balayage paresseux : les demandes patient restees "planifie" au-dela de
  // leur expiration sont annulees, ce qui libere les creneaux.
  async expirerDemandes(): Promise<void> {
    await this.prisma.rendezVous.updateMany({
      where: {
        origine: 'patient',
        statut: 'planifie',
        expireA: { lt: new Date() },
      },
      data: {
        statut: 'annule',
        motifRefus: 'Demande expiree sans reponse de la clinique',
      },
    });
  }

  // --------------------------------------------------------------------------
  // Envoyer une demande de rendez-vous
  // --------------------------------------------------------------------------
  async creerDemande(compteId: string, dto: DemanderRdvDto) {
    await this.expirerDemandes();

    const compte = await this.prisma.comptePatient.findFirst({
      where: { id: compteId, actif: true, deletedAt: null },
    });
    if (!compte) throw new UnauthorizedException('Compte introuvable');
    if (!compte.nom || !compte.dateNaissance || !compte.sexe) {
      throw new BadRequestException(
        'PROFIL_INCOMPLET : renseignez votre nom, votre date de naissance et votre sexe avant de reserver',
      );
    }

    // Clinique et praticien : memes exigences que la surface publique
    const clinique = await this.prisma.hopital.findFirst({
      where: {
        id: dto.cliniqueId,
        actif: true,
        visiblePublic: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!clinique) throw new NotFoundException('Clinique introuvable');

    const praticien = await this.prisma.praticien.findFirst({
      where: {
        id: dto.praticienId,
        hopitalId: dto.cliniqueId,
        visiblePublic: true,
        deletedAt: null,
      },
      select: { id: true },
    });
    if (!praticien) throw new NotFoundException('Praticien introuvable');

    // La prestation : un acte de la clinique avec un tarif EN VIGUEUR.
    // Le montant est fige sur la demande (montantPrevu) au prix du jour.
    const maintenant = new Date();
    const acte = await this.prisma.acte.findFirst({
      where: { id: dto.acteId, hopitalId: dto.cliniqueId, deletedAt: null },
      include: {
        tarifs: {
          where: {
            deletedAt: null,
            dateDebut: { lte: maintenant },
            OR: [{ dateFin: null }, { dateFin: { gte: maintenant } }],
          },
          orderBy: { dateDebut: 'desc' },
          take: 1,
        },
      },
    });
    if (!acte || acte.tarifs.length === 0) {
      throw new NotFoundException(
        'Prestation introuvable ou sans tarif en vigueur',
      );
    }
    const montantPrevu = Number(acte.tarifs[0].montant);

    // Prise en charge : l'assurance doit etre acceptee par la clinique
    if (dto.assuranceId) {
      const assurance = await this.prisma.assurance.findFirst({
        where: { id: dto.assuranceId, hopitalId: dto.cliniqueId, actif: true },
        select: { id: true },
      });
      if (!assurance) throw new NotFoundException('Assurance introuvable');
    }

    const debut = new Date(dto.debut);
    if (isNaN(debut.getTime()) || debut < new Date()) {
      throw new BadRequestException('Creneau invalide ou deja passe');
    }
    const fin = dto.fin ? new Date(dto.fin) : null;

    // Le meme garde-fou que l'Agenda du personnel : pas de chevauchement
    const conflit = await this.disponibilites.verifierConflit(
      dto.cliniqueId,
      dto.praticienId,
      debut,
      fin,
    );
    if (conflit) {
      throw new BadRequestException(
        "Ce creneau vient d'etre pris : choisissez-en un autre",
      );
    }

    const enAttente = await this.prisma.rendezVous.count({
      where: { compteId, origine: 'patient', statut: 'planifie' },
    });
    if (enAttente >= DEMANDES_EN_ATTENTE_MAX) {
      throw new BadRequestException(
        `Vous avez deja ${DEMANDES_EN_ATTENTE_MAX} demandes en attente de validation`,
      );
    }

    const cree = await this.prisma.$transaction(async (tx) => {
      // Le dossier du patient dans CETTE clinique : retrouve, ou cree a
      // partir du compte. L'accueil le completera a l'arrivee du patient.
      const lien = await tx.comptePatientDossier.findUnique({
        where: {
          compteId_hopitalId: { compteId, hopitalId: dto.cliniqueId },
        },
        select: { patientId: true },
      });
      let patientId = lien?.patientId;
      if (!patientId) {
        const numero = await this.genererNumeroDossier(tx, dto.cliniqueId);
        const patient = await tx.patient.create({
          data: {
            hopitalId: dto.cliniqueId,
            numeroDossier: numero,
            nom: compte.nom!,
            prenom: compte.prenom,
            sexe: compte.sexe ?? undefined,
            dateNaissance: compte.dateNaissance ?? undefined,
            telephone: `+${compte.telephone}`,
          },
          select: { id: true },
        });
        patientId = patient.id;
        await tx.comptePatientDossier.create({
          data: { compteId, hopitalId: dto.cliniqueId, patientId },
        });
      } else {
        // Ancien patient : les infos saisies dans son espace completent
        // son dossier medical SANS ecraser ce que la clinique a deja saisi.
        const dossier = await tx.patient.findUnique({
          where: { id: patientId },
          select: { dateNaissance: true, sexe: true, telephone: true },
        });
        if (dossier) {
          await tx.patient.update({
            where: { id: patientId },
            data: {
              dateNaissance: dossier.dateNaissance ?? compte.dateNaissance,
              sexe: dossier.sexe ?? compte.sexe ?? undefined,
              telephone: dossier.telephone ?? `+${compte.telephone}`,
            },
          });
        }
      }

      return tx.rendezVous.create({
        data: {
          hopitalId: dto.cliniqueId,
          patientId,
          praticienId: dto.praticienId,
          compteId,
          debut,
          fin,
          motif: dto.motif ?? null,
          acteId: acte.id,
          modePaiement: dto.modePaiement,
          montantPrevu,
          assuranceId: dto.assuranceId ?? null,
          origine: 'patient',
          statut: 'planifie',
          expireA: new Date(Date.now() + EXPIRATION_DEMANDE_H * 3600000),
        },
        select: VUE_RDV,
      });
    });

    await this.notifierClinique(cree, compte);
    return cree;
  }

  // La clinique est prevenue de chaque nouvelle demande. Un echec d'envoi
  // ne bloque jamais la demande elle-meme.
  private async notifierClinique(rdv: any, compte: any) {
    try {
      if (!rdv?.hopital?.telephone) return;
      const d = rdv.debut instanceof Date ? rdv.debut : new Date(rdv.debut);
      const q = d.toLocaleString('fr-FR', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Douala',
      });
      await this.sms.envoyerAvecGabarit('nouvelle_demande', [(compte.prenom ? compte.prenom + ' ' : '') + compte.nom, q],
        rdv.hopital.telephone,
        `Kliniko : nouvelle demande de rendez-vous de ${compte.prenom ?? ''} ${compte.nom} pour le ${q}. Connectez-vous a l'application pour la traiter.`,
      );
    } catch (e) {
      console.error('Notification clinique impossible :', (e as Error).message);
    }
  }
  // Numerotation P-NNNN dans la transaction, comme les factures.
  private async genererNumeroDossier(
    tx: any,
    hopitalId: string,
  ): Promise<string> {
    const dernier = await tx.patient.findFirst({
      where: { hopitalId, numeroDossier: { startsWith: 'P-' } },
      orderBy: { numeroDossier: 'desc' },
      select: { numeroDossier: true },
    });
    const brut = dernier ? Number(dernier.numeroDossier.slice(2)) : 0;
    const suivant = isNaN(brut) ? 1 : brut + 1;
    return 'P-' + String(suivant).padStart(4, '0');
  }

  // --------------------------------------------------------------------------
  // Mes rendez-vous
  // --------------------------------------------------------------------------
  async mesRendezVous(compteId: string) {
    await this.expirerDemandes();
    return this.prisma.rendezVous.findMany({
      where: { compteId, deletedAt: null },
      select: VUE_RDV,
      orderBy: { debut: 'desc' },
    });
  }

  // Le patient annule sa propre demande (ou un rendez-vous confirme).
  async annulerDemande(compteId: string, id: string) {
    const rdv = await this.prisma.rendezVous.findFirst({
      where: { id, compteId, deletedAt: null },
      select: { id: true, statut: true },
    });
    if (!rdv) throw new NotFoundException('Rendez-vous introuvable');
    if (rdv.statut === 'annule' || rdv.statut === 'honore') {
      throw new BadRequestException('Ce rendez-vous ne peut plus etre annule');
    }
    return this.prisma.rendezVous.update({
      where: { id },
      data: { statut: 'annule', motifRefus: 'Annule par le patient' },
      select: VUE_RDV,
    });
  }
}
