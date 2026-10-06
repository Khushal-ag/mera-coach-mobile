/** Static description templates for coach profiles. */

interface DescriptionSuggestionInput {
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
  const named = input.coachName.trim();
  const category = input.categoryLabel.trim() || 'health and wellness coach';
  const services =
    input.serviceLabels.length > 0 ? input.serviceLabels.slice(0, 4).join(', ').toLowerCase() : '';
  const exp = parseInt(input.experienceYears, 10);
  const clients = parseInt(input.happyClientCount, 10);
  const expPhrase = exp > 0 ? `${exp}+ years of experience` : '';
  const clientPhrase = clients > 0 ? `${clients}+ clients` : '';
  const facts = [expPhrase, clientPhrase].filter(Boolean).join(' and ');
  const role = category.toLowerCase();
  const intro = named ? `${named} is a ${role}` : `I am a ${role}`;

  const base = input.categoryDescription?.trim();

  const options: string[] = [
    trimSentence(
      `${intro}${facts ? ` with ${facts}` : ''}${services ? `. Services: ${services}` : ''}`,
    ),
    trimSentence(
      services
        ? `I offer ${services}. Plans stay simple and practical`
        : `I am a ${role}. Plans stay simple and practical`,
    ),
  ];

  if (base) {
    const who = named ? `${named} works` : 'I work';
    options.push(
      trimSentence(
        `${base} ${who} with ${clientPhrase || 'clients'}${services ? ` on ${services}` : ''}`,
      ),
    );
  } else {
    options.push(
      trimSentence(
        named
          ? `Hi, I'm ${named}. I coach fitness, nutrition, and daily habits`
          : 'I coach fitness, nutrition, and daily habits',
      ),
    );
  }

  return options.filter(Boolean).slice(0, 3);
}
