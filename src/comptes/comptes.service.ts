import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { SmsService } from './sms.service';
import { clePatient } from './patient-auth.guard';
import { ProfilDto } from './dto/comptes.dto';

const VALIDITE_CODE_MIN = 5;
const TENTATIVES_MAX = 5;
const DEMANDES_MAX = 3; // par numero et par quart d'heure
const FENETRE_DEMANDES_MIN = 15;
const VALIDITE_JETON = '30d';

const VUE_COMPTE = {
  id: true,
  telephone: true,
  nom: true,
  prenom: true,
  dateNaissance: true,
  sexe: true,
};

@Injectable()
export class ComptesService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private sms: SmsService,
  ) {}

  // Accepte 6XXXXXXXX, 2376XXXXXXXX, +237 6XX..., avec ou sans espaces.
  // Stocke sous la forme canonique 2376XXXXXXXX.
  private normaliser(brut: string): string {
    const chiffres = (brut ?? '').replace(/\D/g, '');
    if (/^237[62]\d{8}$/.test(chiffres)) return chiffres;
    if (/^[62]\d{8}$/.test(chiffres)) return `237${chiffres}`;
    throw new BadRequestException(
      'Numero de telephone camerounais attendu (ex : 6 91 62 81 42)',
    );
  }

  // --------------------------------------------------------------------------
  // Etape 1 : demander un code
  // --------------------------------------------------------------------------
  async demanderCode(telephoneBrut: string) {
    const telephone = this.normaliser(telephoneBrut);

    // Garde-fou anti-abus : pas plus de N codes par quart d'heure et par numero
    const depuis = new Date(Date.now() - FENETRE_DEMANDES_MIN * 60000);
    const recentes = await this.prisma.codeVerification.count({
      where: { telephone, createdAt: { gte: depuis } },
    });
    if (recentes >= DEMANDES_MAX) {
      throw new BadRequestException(
        'Trop de demandes pour ce numero. Reessayez dans quelques minutes.',
      );
    }

    const code = String(randomInt(0, 1000000)).padStart(6, '0');
    await this.prisma.codeVerification.create({
      data: {
        telephone,
        codeHash: await bcrypt.hash(code, 10),
        expireA: new Date(Date.now() + VALIDITE_CODE_MIN * 60000),
      },
    });

    await this.sms.envoyer(
      telephone,
      `Kliniko : votre code de verification est ${code}. Il expire dans ${VALIDITE_CODE_MIN} minutes.`,
    );

    // Le code ne sort JAMAIS par la reponse HTTP.
    return { message: 'Code envoye par SMS' };
  }

  // --------------------------------------------------------------------------
  // Etape 2 : verifier le code -> jeton patient
  // --------------------------------------------------------------------------
  async verifier(telephoneBrut: string, code: string) {
    const telephone = this.normaliser(telephoneBrut);

    const dernier = await this.prisma.codeVerification.findFirst({
      where: { telephone, consommeLe: null },
      orderBy: { createdAt: 'desc' },
    });
    if (!dernier || dernier.expireA < new Date()) {
      throw new UnauthorizedException(
        'Code expire ou introuvable : demandez un nouveau code',
      );
    }
    if (dernier.tentatives >= TENTATIVES_MAX) {
      throw new UnauthorizedException(
        'Trop de tentatives : demandez un nouveau code',
      );
    }

    const valide = await bcrypt.compare(code, dernier.codeHash);
    if (!valide) {
      await this.prisma.codeVerification.update({
        where: { id: dernier.id },
        data: { tentatives: { increment: 1 } },
      });
      throw new UnauthorizedException('Code incorrect');
    }

    await this.prisma.codeVerification.update({
      where: { id: dernier.id },
      data: { consommeLe: new Date() },
    });

    // Le compte est cree a la premiere verification reussie.
    let compte = await this.prisma.comptePatient.findUnique({
      where: { telephone },
      select: { ...VUE_COMPTE, actif: true, deletedAt: true },
    });
    if (!compte) {
      compte = await this.prisma.comptePatient.create({
        data: { telephone },
        select: { ...VUE_COMPTE, actif: true, deletedAt: true },
      });
    }
    if (!compte.actif || compte.deletedAt) {
      throw new UnauthorizedException('Ce compte est desactive');
    }

    const accessToken = await this.jwt.signAsync(
      { sub: compte.id, telephone, typ: 'patient' },
      { secret: clePatient(), expiresIn: VALIDITE_JETON },
    );

    return {
      accessToken,
      compte: {
        id: compte.id,
        telephone: compte.telephone,
        nom: compte.nom,
        prenom: compte.prenom,
      },
      profilComplet: Boolean(compte.nom),
    };
  }

  // --------------------------------------------------------------------------
  // Profil
  // --------------------------------------------------------------------------
  async moi(compteId: string) {
    const compte = await this.prisma.comptePatient.findFirst({
      where: { id: compteId, actif: true, deletedAt: null },
      select: VUE_COMPTE,
    });
    if (!compte) throw new UnauthorizedException('Compte introuvable');
    return compte;
  }

  async completerProfil(compteId: string, dto: ProfilDto) {
    await this.moi(compteId);
    return this.prisma.comptePatient.update({
      where: { id: compteId },
      data: {
        nom: dto.nom,
        prenom: dto.prenom ?? null,
        dateNaissance: dto.dateNaissance ? new Date(dto.dateNaissance) : null,
        sexe: dto.sexe ?? null,
      },
      select: VUE_COMPTE,
    });
  }
}
