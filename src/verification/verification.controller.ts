import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

function echapper(t: string | null | undefined): string {
  return (t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

type Verdict = {
  classe: 'ok' | 'ko' | 'warn';
  texte: string;
  detail: string;
};

function page(titre: string, verdict: Verdict, corps: string): string {
  return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${titre} — Kliniko</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Segoe UI", Helvetica, Arial, sans-serif; background: #f2f6f5;
         color: #1c2430; min-height: 100vh; display: flex; align-items: center;
         justify-content: center; padding: 20px; }
  .carte { background: #fff; border-radius: 14px; box-shadow: 0 6px 24px rgba(12,42,40,.12);
           max-width: 420px; width: 100%; overflow: hidden; }
  .tete { background: #0c2a28; color: #fff; padding: 14px 20px; font-weight: 700; }
  .tete span { color: #2dd4bf; }
  .verdict { padding: 22px 20px 16px; text-align: center; }
  .verdict .badge { display: inline-block; padding: 8px 18px; border-radius: 999px;
                    font-weight: 700; font-size: 17px; }
  .ok .badge   { background: #e6f4ec; color: #1c6b3c; }
  .ko .badge   { background: #fdece7; color: #b91c1c; }
  .warn .badge { background: #fdf3e2; color: #b7791f; }
  .verdict p { margin-top: 10px; color: #5b6572; font-size: 14px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; }
  td { padding: 9px 20px; font-size: 14px; border-top: 1px solid #eef2f1; }
  td:first-child { color: #8a94a1; width: 40%; }
  .pied { padding: 12px 20px 16px; font-size: 11px; color: #8a94a1; text-align: center; }
</style></head><body>
<div class="carte">
  <div class="tete"><span>+</span> Kliniko — ${titre}</div>
  <div class="verdict ${verdict.classe}">
    <span class="badge">${verdict.texte}</span>
    <p>${verdict.detail}</p>
  </div>
  ${corps}
  <div class="pied">Vérification effectuée en temps réel sur app.kliniko.cm — aucune donnée médicale n'est affichée.</div>
</div>
</body></html>`;
}

function dateFr(d: Date | null): string {
  return d
    ? new Date(d).toLocaleDateString('fr-FR', { timeZone: 'Africa/Douala' })
    : '—';
}

function montantFr(n: unknown): string {
  return Number(n).toLocaleString('fr-FR') + ' XAF';
}

// Pages publiques de verification : on scanne le code QR imprime sur une
// ordonnance ou un recu et on voit si le document est authentique.
// Aucune donnee medicale n'est exposee - ni les medicaments, ni le dossier.
@Controller('public/ordonnances')
export class VerificationController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get(':id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async verifier(@Param('id') id: string): Promise<string> {
    const o = FORME_UUID.test(id)
      ? await this.prisma.ordonnance.findFirst({
          where: { id, deletedAt: null },
          select: {
            numero: true,
            statut: true,
            dateOrdonnance: true,
            hopital: { select: { nom: true, ville: true } },
            praticien: { select: { nom: true, prenom: true } },
            patient: { select: { nom: true, prenom: true } },
            lignes: { select: { id: true } },
          },
        })
      : null;

    let verdictClasse = 'ko';
    let verdictTexte = 'Document non reconnu';
    let detail =
      "Ce code ne correspond a aucune ordonnance connue de Kliniko. Le document presente n'est pas authentique.";
    let corps = '';

    if (o) {
      if (o.statut === 'validee') {
        verdictClasse = 'ok';
        verdictTexte = 'Ordonnance authentique';
        detail = 'Cette ordonnance a ete signee electroniquement.';
      } else if (o.statut === 'annulee') {
        verdictClasse = 'ko';
        verdictTexte = 'Ordonnance ANNULEE';
        detail =
          'Cette ordonnance a ete annulee par la clinique et ne doit pas etre servie.';
      } else {
        verdictClasse = 'warn';
        verdictTexte = 'Brouillon non signe';
        detail =
          "Cette ordonnance n'a pas encore ete signee : elle ne doit pas etre servie.";
      }

      const patient = `${o.patient.nom} ${
        o.patient.prenom ? o.patient.prenom.charAt(0) + '.' : ''
      }`.trim();
      const praticien = o.praticien
        ? `${o.praticien.prenom ?? ''} ${o.praticien.nom}`.trim()
        : '—';
      const date = o.dateOrdonnance
        ? new Date(o.dateOrdonnance).toLocaleDateString('fr-FR', {
            timeZone: 'Africa/Douala',
          })
        : '—';

      corps = `
      <table>
        <tr><td>N°</td><td><b>${echapper(o.numero)}</b></td></tr>
        <tr><td>Date</td><td>${date}</td></tr>
        <tr><td>Clinique</td><td>${echapper(o.hopital.nom)}${
          o.hopital.ville ? ' — ' + echapper(o.hopital.ville) : ''
        }</td></tr>
        <tr><td>Prescripteur</td><td>${echapper(praticien)}</td></tr>
        <tr><td>Patient</td><td>${echapper(patient)}</td></tr>
        <tr><td>Prescriptions</td><td>${o.lignes.length} ligne${
          o.lignes.length > 1 ? 's' : ''
        }</td></tr>
      </table>`;
    }

    return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Vérification d'ordonnance — Kliniko</title>
<style>
  * { box-sizing: border-box; margin: 0; }
  body { font-family: "Segoe UI", Helvetica, Arial, sans-serif; background: #f2f6f5;
         color: #1c2430; min-height: 100vh; display: flex; align-items: center;
         justify-content: center; padding: 20px; }
  .carte { background: #fff; border-radius: 14px; box-shadow: 0 6px 24px rgba(12,42,40,.12);
           max-width: 420px; width: 100%; overflow: hidden; }
  .tete { background: #0c2a28; color: #fff; padding: 14px 20px; font-weight: 700; }
  .tete span { color: #2dd4bf; }
  .verdict { padding: 22px 20px 16px; text-align: center; }
  .verdict .badge { display: inline-block; padding: 8px 18px; border-radius: 999px;
                    font-weight: 700; font-size: 17px; }
  .ok .badge   { background: #e6f4ec; color: #1c6b3c; }
  .ko .badge   { background: #fdece7; color: #b91c1c; }
  .warn .badge { background: #fdf3e2; color: #b7791f; }
  .verdict p { margin-top: 10px; color: #5b6572; font-size: 14px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; }
  td { padding: 9px 20px; font-size: 14px; border-top: 1px solid #eef2f1; }
  td:first-child { color: #8a94a1; width: 40%; }
  .pied { padding: 12px 20px 16px; font-size: 11px; color: #8a94a1; text-align: center; }
</style></head><body>
<div class="carte">
  <div class="tete"><span>+</span> Kliniko — Vérification d'ordonnance</div>
  <div class="verdict ${verdictClasse}">
    <span class="badge">${verdictTexte}</span>
    <p>${detail}</p>
  </div>
  ${corps}
  <div class="pied">Vérification effectuée en temps réel sur app.kliniko.cm — aucune donnée médicale n'est affichée.</div>
</div>
</body></html>`;
  }
}

// Verification d'un recu / d'une facture
@Controller('public/factures')
export class VerificationFacturesController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get(':id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async verifier(@Param('id') id: string): Promise<string> {
    const f = FORME_UUID.test(id)
      ? await this.prisma.facture.findFirst({
          where: { id, deletedAt: null },
          select: {
            numero: true,
            statut: true,
            dateFacture: true,
            montantTotal: true,
            montantPaye: true,
            hopital: { select: { nom: true, ville: true } },
            patient: { select: { nom: true, prenom: true } },
            lignes: { select: { id: true } },
          },
        })
      : null;

    if (!f) {
      return page('Vérification de reçu', {
        classe: 'ko',
        texte: 'Document non reconnu',
        detail:
          "Ce code ne correspond a aucune facture connue de Kliniko. Le document presente n'est pas authentique.",
      }, '');
    }

    let verdict: Verdict;
    if (f.statut === 'reglee') {
      verdict = {
        classe: 'ok',
        texte: 'Reçu authentique',
        detail: 'Cette facture est intégralement réglée.',
      };
    } else if (f.statut === 'partielle') {
      verdict = {
        classe: 'warn',
        texte: 'Paiement partiel',
        detail: `Facture authentique, partiellement réglée : ${montantFr(f.montantPaye)} payés sur ${montantFr(f.montantTotal)}.`,
      };
    } else if (f.statut === 'annulee') {
      verdict = {
        classe: 'ko',
        texte: 'Facture ANNULÉE',
        detail: 'Cette facture a été annulée par la clinique.',
      };
    } else {
      verdict = {
        classe: 'warn',
        texte: 'Facture non réglée',
        detail: 'Facture authentique, mais aucun règlement complet enregistré.',
      };
    }

    const patient = `${f.patient.nom} ${
      f.patient.prenom ? f.patient.prenom.charAt(0) + '.' : ''
    }`.trim();

    const corps = `
      <table>
        <tr><td>N°</td><td><b>${echapper(f.numero)}</b></td></tr>
        <tr><td>Date</td><td>${dateFr(f.dateFacture)}</td></tr>
        <tr><td>Clinique</td><td>${echapper(f.hopital.nom)}${
          f.hopital.ville ? ' — ' + echapper(f.hopital.ville) : ''
        }</td></tr>
        <tr><td>Patient</td><td>${echapper(patient)}</td></tr>
        <tr><td>Montant</td><td><b>${montantFr(f.montantTotal)}</b></td></tr>
        <tr><td>Payé</td><td>${montantFr(f.montantPaye)}</td></tr>
        <tr><td>Lignes</td><td>${f.lignes.length}</td></tr>
      </table>`;

    return page('Vérification de reçu', verdict, corps);
  }
}
