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

// Page publique de verification d'une ordonnance : le pharmacien scanne le
// code QR imprime et voit si le document est authentique, signe ou annule.
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
