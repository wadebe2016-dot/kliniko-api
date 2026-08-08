import { Controller, Get, Header, Param } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { PrismaService } from '../prisma/prisma.service';

const FORME_UUID =
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const MOIS = [
  'Janvier',
  'Février',
  'Mars',
  'Avril',
  'Mai',
  'Juin',
  'Juillet',
  'Août',
  'Septembre',
  'Octobre',
  'Novembre',
  'Décembre',
];

function echapper(t: string | null | undefined): string {
  return (t ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Page publique de verification d'un bulletin de paie : on scanne le code
// QR imprime sur le bulletin. Le montant net s'affiche (le porteur du
// papier l'a deja sous les yeux) mais aucun autre detail salarial.
@Controller('public/bulletins')
export class BulletinsPublicsController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get(':id')
  @Header('Content-Type', 'text/html; charset=utf-8')
  @Header('Cache-Control', 'no-store')
  async verifier(@Param('id') id: string): Promise<string> {
    const b = FORME_UUID.test(id)
      ? await this.prisma.bulletinPaie.findFirst({
          where: { id },
          select: {
            id: true,
            mois: true,
            annee: true,
            net: true,
            statutVersement: true,
            dateVersement: true,
            genereLe: true,
            hopital: { select: { nom: true, ville: true } },
            personnel: {
              select: { nom: true, prenom: true, matricule: true },
            },
          },
        })
      : null;

    let classe = 'ko';
    let texte = 'Document non reconnu';
    let detail =
      "Ce code ne correspond à aucun bulletin connu de Kliniko. Le document présenté n'est pas authentique.";
    let corps = '';

    if (b) {
      classe = 'ok';
      texte = 'Bulletin authentique';
      detail = 'Ce bulletin a bien été établi par la clinique via Kliniko.';

      const employe = `${b.personnel.nom} ${
        b.personnel.prenom ? b.personnel.prenom.charAt(0) + '.' : ''
      }`.trim();
      const versement =
        b.statutVersement === 'paye'
          ? `Payé le ${
              b.dateVersement
                ? new Date(b.dateVersement).toLocaleDateString('fr-FR', {
                    timeZone: 'Africa/Douala',
                  })
                : '—'
            }`
          : 'En attente de versement';

      corps = `
      <table>
        <tr><td>N°</td><td><b>${echapper(b.id.slice(0, 8).toUpperCase())}</b></td></tr>
        <tr><td>Période</td><td>${MOIS[b.mois - 1]} ${b.annee}</td></tr>
        <tr><td>Clinique</td><td>${echapper(b.hopital.nom)}${
          b.hopital.ville ? ' — ' + echapper(b.hopital.ville) : ''
        }</td></tr>
        <tr><td>Employé</td><td>${echapper(employe)}${
          b.personnel.matricule
            ? ' (' + echapper(b.personnel.matricule) + ')'
            : ''
        }</td></tr>
        <tr><td>Net à payer</td><td><b>${Number(b.net).toLocaleString('fr-FR')} XAF</b></td></tr>
        <tr><td>Versement</td><td>${versement}</td></tr>
        <tr><td>Édité le</td><td>${new Date(b.genereLe).toLocaleDateString('fr-FR', { timeZone: 'Africa/Douala' })}</td></tr>
      </table>`;
    }

    return `<!DOCTYPE html>
<html lang="fr"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Vérification de bulletin — Kliniko</title>
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
  .verdict p { margin-top: 10px; color: #5b6572; font-size: 14px; line-height: 1.5; }
  table { width: 100%; border-collapse: collapse; margin: 4px 0 8px; }
  td { padding: 9px 20px; font-size: 14px; border-top: 1px solid #eef2f1; }
  td:first-child { color: #8a94a1; width: 40%; }
  .pied { padding: 12px 20px 16px; font-size: 11px; color: #8a94a1; text-align: center; }
</style></head><body>
<div class="carte">
  <div class="tete"><span>+</span> Kliniko — Vérification de bulletin</div>
  <div class="verdict ${classe}">
    <span class="badge">${texte}</span>
    <p>${detail}</p>
  </div>
  ${corps}
  <div class="pied">Vérification effectuée en temps réel sur app.kliniko.cm — seul le net à payer est affiché.</div>
</div>
</body></html>`;
  }
}
