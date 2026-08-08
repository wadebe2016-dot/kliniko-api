import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DisponibilitesService } from '../disponibilites/disponibilites.service';
import { SmsService } from '../comptes/sms.service';
import { FacturesService } from '../factures/factures.service';
import { CreateRendezVousDto } from './dto/create-rendez-vous.dto';
import { UpdateRendezVousDto } from './dto/update-rendez-vous.dto';

// Les informations renvoyees avec chaque rendez-vous : le patient (pour
// l'agenda), et le volet prestation/paiement de la chaine caisse — l'etat
// "paye, pret pour pre-consultation" se DEDUIT de la facture liee, il n'est
// jamais stocke.
const AVEC_PATIENT = {
  patient: { select: { nom: true, prenom: true, numeroDossier: true } },
  acte: { select: { code: true, libelle: true } },
  assurance: { select: { nom: true } },
  facture: {
    select: {
      id: true,
      numero: true,
      statut: true,
      montantTotal: true,
      montantPaye: true,
    },
  },
};

// Statuts pour lesquels le creneau est reellement occupe
const STATUTS_VIVANTS = ['planifie', 'confirme', 'honore'];

function quand(d: Date): string {
  return d.toLocaleString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Africa/Douala',
  });
}

@Injectable()
export class RendezVousService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly disponibilites: DisponibilitesService,
    private readonly sms: SmsService,
    private readonly factures: FacturesService,
  ) {}

  // Verifie qu'un patient existe et appartient bien a la clinique
  private async verifierPatient(hopitalId: string, patientId: string) {
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });
    if (!patient || patient.deletedAt || patient.hopitalId !== hopitalId) {
      throw new BadRequestException(
        `Patient ${patientId} introuvable dans cette clinique`,
      );
    }
  }

  // Refuse le creneau s'il chevauche un rendez-vous vivant ou une
  // indisponibilite du praticien (ou de la clinique entiere).
  private async refuserSiConflit(
    hopitalId: string,
    praticienId: string | null | undefined,
    debut: Date,
    fin: Date | null,
    rendezVousIgnore?: string,
  ) {
    if (!praticienId) return;
    const conflit = await this.disponibilites.verifierConflit(
      hopitalId,
      praticienId,
      debut,
      fin,
      rendezVousIgnore,
    );
    if (conflit) throw new BadRequestException(conflit);
  }

  // Previent le patient de l'application quand la clinique repond a sa
  // demande. Un echec d'envoi ne bloque JAMAIS l'operation.
  private async notifierPatient(rdv: any, nouveauStatut: string) {
    try {
      if (rdv.origine !== 'patient' || !rdv.compteId) return;
      if (nouveauStatut !== 'confirme' && nouveauStatut !== 'annule') return;
      const compte = await this.prisma.comptePatient.findUnique({
        where: { id: rdv.compteId },
        select: { telephone: true },
      });
      if (!compte) return;
      const clinique = await this.prisma.hopital.findUnique({
        where: { id: rdv.hopitalId },
        select: { nom: true, telephone: true },
      });
      const message =
        nouveauStatut === 'confirme'
          ? `Kliniko : votre rendez-vous du ${quand(rdv.debut)} est CONFIRME par ${clinique?.nom ?? 'la clinique'}. Presentez-vous 10 minutes en avance.`
          : `Kliniko : votre rendez-vous du ${quand(rdv.debut)} a ete annule par ${clinique?.nom ?? 'la clinique'}.${clinique?.telephone ? ` Contact : ${clinique.telephone}` : ''}`;
      await this.sms.envoyerAvecGabarit(nouveauStatut === 'confirme' ? 'rdv_confirme' : 'rdv_annule', nouveauStatut === 'confirme' ? [quand(rdv.debut), clinique?.nom ?? 'la clinique'] : [quand(rdv.debut), clinique?.nom ?? 'la clinique', clinique?.telephone ?? 'la clinique'], compte.telephone, message);
    } catch (e) {
      // volontairement silencieux : la notification est un plus, jamais un blocage
      console.error('Notification patient impossible :', (e as Error).message);
    }
  }

  // Creer un rendez-vous
  async create(hopitalId: string, dto: CreateRendezVousDto) {
    await this.verifierPatient(hopitalId, dto.patientId);
    const debut = new Date(dto.debut);
    const fin = dto.fin ? new Date(dto.fin) : null;
    await this.refuserSiConflit(hopitalId, dto.praticienId, debut, fin);
    return this.prisma.rendezVous.create({
      data: {
        hopitalId,
        patientId: dto.patientId,
        praticienId: dto.praticienId,
        serviceId: dto.serviceId,
        debut,
        fin: fin ?? undefined,
        motif: dto.motif,
        origine: dto.origine,
      },
      include: AVEC_PATIENT,
    });
  }

  // Lister les rendez-vous de la clinique, avec periode optionnelle
  async findAll(hopitalId: string, du?: string, au?: string) {
    return this.prisma.rendezVous.findMany({
      where: {
        hopitalId,
        deletedAt: null,
        ...(du || au
          ? {
              debut: {
                ...(du ? { gte: new Date(du) } : {}),
                ...(au ? { lte: new Date(au) } : {}),
              },
            }
          : {}),
      },
      orderBy: { debut: 'asc' },
      include: AVEC_PATIENT,
    });
  }

  // Consulter un rendez-vous (refuse ceux des autres cliniques)
  async findOne(hopitalId: string, id: string) {
    const rdv = await this.prisma.rendezVous.findUnique({
      where: { id },
      include: AVEC_PATIENT,
    });
    if (!rdv || rdv.deletedAt || rdv.hopitalId !== hopitalId) {
      throw new NotFoundException(`Rendez-vous ${id} introuvable`);
    }
    return rdv;
  }

  // Modifier un rendez-vous (dates, motif, statut, praticien...)
  async update(hopitalId: string, id: string, dto: UpdateRendezVousDto) {
    const existant = await this.findOne(hopitalId, id);
    if (dto.patientId) {
      await this.verifierPatient(hopitalId, dto.patientId);
    }

    const statutFinal = dto.statut ?? existant.statut;
    const praticienFinal = dto.praticienId ?? existant.praticienId;
    const debutFinal = dto.debut ? new Date(dto.debut) : existant.debut;
    const finFinal = dto.fin ? new Date(dto.fin) : existant.fin;

    if (STATUTS_VIVANTS.includes(statutFinal)) {
      await this.refuserSiConflit(
        hopitalId,
        praticienFinal,
        debutFinal,
        finFinal,
        id,
      );
    }

    const maj = await this.prisma.rendezVous.update({
      where: { id },
      data: {
        ...dto,
        debut: dto.debut ? new Date(dto.debut) : undefined,
        fin: dto.fin ? new Date(dto.fin) : undefined,
      },
      include: AVEC_PATIENT,
    });

    // La reponse de la clinique a une demande patient part en notification,
    // et la chaine caisse s'enclenche : facture generee a la confirmation
    // (au montant fige sur la demande), annulee si le rendez-vous tombe.
    // Comme la notification, la facturation n'est JAMAIS bloquante : si elle
    // echoue, le rendez-vous reste confirme et la caisse facturera a la main.
    if (dto.statut && dto.statut !== existant.statut) {
      if (dto.statut === 'confirme') {
        try {
          await this.factures.creerPourRendezVous(hopitalId, id);
        } catch (e) {
          console.error(
            'Facturation du rendez-vous impossible :',
            (e as Error).message,
          );
        }
      }
      if (dto.statut === 'annule' || dto.statut === 'absent') {
        try {
          await this.factures.annulerPourRendezVous(
            hopitalId,
            id,
            dto.statut === 'absent'
              ? 'Patient absent au rendez-vous'
              : 'Rendez-vous annule',
          );
        } catch (e) {
          console.error(
            'Annulation de la facture du rendez-vous impossible :',
            (e as Error).message,
          );
        }
      }
      await this.notifierPatient(maj, dto.statut);
    }
    return maj;
  }

  // Annulation : changement de statut, on ne supprime jamais
  async annuler(hopitalId: string, id: string) {
    const existant = await this.findOne(hopitalId, id);
    const maj = await this.prisma.rendezVous.update({
      where: { id },
      data: { statut: 'annule' },
      include: AVEC_PATIENT,
    });
    if (existant.statut !== 'annule') {
      try {
        await this.factures.annulerPourRendezVous(
          hopitalId,
          id,
          'Rendez-vous annule',
        );
      } catch (e) {
        console.error(
          'Annulation de la facture du rendez-vous impossible :',
          (e as Error).message,
        );
      }
      await this.notifierPatient(maj, 'annule');
    }
    return maj;
  }
}
