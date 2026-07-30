import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Assistant de redaction de comptes-rendus via AWS Bedrock.
// Regle de confidentialite : AUCUNE donnee nominative (nom, telephone...)
// n'est transmise au modele — uniquement le contenu clinique.
@Injectable()
export class IaService {
  private readonly client = new BedrockRuntimeClient({
    region: process.env.BEDROCK_REGION ?? 'eu-west-3',
  });

  async suggererCompteRendu(donnees: {
    motif?: string | null;
    observations?: string | null;
    diagnostic?: string | null;
    sexe?: string | null;
  }): Promise<string> {
    const prompt = [
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

    try {
      const reponse = await this.client.send(
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
    } catch (e) {
      console.error('Erreur Bedrock :', (e as Error).message);
      throw new ServiceUnavailableException(
        "L'assistant IA est indisponible pour le moment",
      );
    }
  }
}
