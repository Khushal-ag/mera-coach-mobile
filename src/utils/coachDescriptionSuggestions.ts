/** Static description templates for coach profiles. */

export interface DescriptionSuggestionInput {
  coachName: string;
  categoryLabel: string;
  categoryDescription?: string;
  serviceLabels: string[];
  experienceYears: string;
  happyClientCount: string;
}

function trimSentence(text: string): string {
  const t = text.replace(/\s+/g, ' ').trim();
  if (!t) return '';
  return t.endsWith('.') ? t : `${t}.`;
}

export function buildCoachDescriptionSuggestions(input: DescriptionSuggestionInput): string[] {
  const name = input.coachName.trim() || 'I';
  const category = input.categoryLabel.trim() || 'health and wellness coach';
  const services =
    input.serviceLabels.length > 0
      ? input.serviceLabels.slice(0, 4).join(', ')
      : 'personalized coaching';
  const exp = parseInt(input.experienceYears, 10);
  const clients = parseInt(input.happyClientCount, 10);
  const expPhrase = exp > 0 ? `${exp}+ years of experience` : 'hands-on coaching experience';
  const clientPhrase = clients > 0 ? `${clients}+ happy clients` : 'clients who trust my guidance';

  const base = input.categoryDescription?.trim();

  const options: string[] = [
    trimSentence(
      `${name} is a ${category.toLowerCase()} with ${expPhrase}, helping ${clientPhrase} reach sustainable health goals through ${services.toLowerCase()}.`,
    ),
    trimSentence(
      `Passionate ${category.toLowerCase()} offering ${services.toLowerCase()}. I focus on practical plans and accountability that fit your routine.`,
    ),
  ];

  if (base) {
    options.push(
      trimSentence(`${base} ${name} works with ${clientPhrase} on ${services.toLowerCase()}.`),
    );
  } else {
    options.push(
      trimSentence(
        `Hi, I'm ${name}. I help with fitness, nutrition, and daily habits. Let's build a plan that works for you.`,
      ),
    );
  }

  return options.filter(Boolean).slice(0, 3);
}
