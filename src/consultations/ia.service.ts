import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Assistant de redaction de comptes-rendus.
// Strategie : AWS Bedrock d'abord ; si indisponible (quota, panne...),
// bascule automatique sur l'API Anthropic directe (ANTHROPIC_API_KEY).
// Regle de confidentialite : AUCUNE donnee nominative n'est transmise
// au modele — uniquement le contenu clinique.
@Injectable()
export class IaService {
  private readonly bedrock = new BedrockRuntimeClient({
    region: process.env.BEDROCK_REGION ?? 'eu-west-3',
  });

  async suggererCompteRendu(donnees: {
    motif?: string | null;
    observations?: string | null;
    diagnostic?: string | null;
    sexe?: string | null;
  }): Promise<string> {
    const prompt = this.construirePrompt(donnees);

    // 1. Bedrock (infrastructure AWS habituelle)
    try {
      return await this.viaBedrock(prompt);
    } catch (e) {
      console.error('Bedrock indisponible :', (e as Error).message);
    }

    // 2. Bascule : API Anthropic directe
    try {
      return await this.viaAnthropic(prompt);
    } catch (e) {
      console.error('Erreur API Anthropic :', (e as Error).message);
      throw new ServiceUnavailableException(
        "L'assistant IA est indisponible pour le moment",
      );
    }
  }

  private construirePrompt(donnees: {
    motif?: string | null;
    observations?: string | null;
    diagnostic?: string | null;
    sexe?: string | null;
  }): string {
    return [
      'Tu es un assistant de redaction de comptes-rendus de consultation',
      'pour une clinique au Cameroun. A partir des notes brutes ci-dessous,',
      'redige un compte-rendu clair et structure en francais, avec les',
      'sections : Motif, Examen et observations, Diagnostic retenu,',
      'Conduite a tenir.',
      '',
      'Regles imperatives :',
      "- N'invente AUCUNE information absente des notes ; ecris",
      '  "non renseigne" si un element manque.',
      '- Ne propose aucune prescription medicamenteuse precise (molecule,',
      '  dosage) : la prescription releve du praticien.',
      '- Reste sobre et factuel.',
      '- Termine par la ligne exacte :',
      '  "Proposition generee par IA - a valider par le praticien."',
      '',
      `Sexe du patient : ${donnees.sexe ?? 'non renseigne'}`,
      `Motif : ${donnees.motif || 'non renseigne'}`,
      `Notes brutes : ${donnees.observations || 'non renseigne'}`,
      `Diagnostic envisage : ${donnees.diagnostic || 'non renseigne'}`,
    ].join('\n');
  }

  private async viaBedrock(prompt: string): Promise<string> {
    const reponse = await this.bedrock.send(
      new ConverseCommand({
        modelId:
          process.env.BEDROCK_MODEL_ID ??
          'eu.anthropic.claude-haiku-4-5-20251001-v1:0',
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: {
          maxTokens: Number(process.env.BEDROCK_MAX_TOKENS ?? 800),
          temperature: Number(process.env.BEDROCK_TEMPERATURE ?? 0.3),
        },
      }),
    );
    const texte =
      reponse.output?.message?.content
        ?.map((bloc) => bloc.text ?? '')
        .join('') ?? '';
    if (!texte.trim()) {
      throw new Error('Reponse vide du modele');
    }
    return texte.trim();
  }

  private async viaAnthropic(prompt: string): Promise<string> {
    const cle = process.env.ANTHROPIC_API_KEY;
    if (!cle) {
      throw new Error('ANTHROPIC_API_KEY absente du .env');
    }
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': cle,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5',
        max_tokens: Number(process.env.BEDROCK_MAX_TOKENS ?? 800),
        temperature: Number(process.env.BEDROCK_TEMPERATURE ?? 0.3),
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} : ${detail.slice(0, 200)}`);
    }
    const data: any = await res.json();
    const texte = Array.isArray(data.content)
      ? data.content.map((b: any) => b.text ?? '').join('')
      : '';
    if (!texte.trim()) {
      throw new Error('Reponse vide du modele');
    }
    return texte.trim();
  }
}
