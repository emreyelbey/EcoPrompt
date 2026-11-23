// Metodoloji kaynakçası testi: şartname 3.5'teki 4 kaynak var ve hiçbirinde marka adı yok.
import { describe, it, expect } from 'vitest';
import { ACADEMIC_REFERENCES } from '../src/lib/methodology.js';

const YASAKLI = /\b(openai|chatgpt|gpt|claude|anthropic|gemini|google|bard|copilot|microsoft|llama|mistral|deepseek|grok|perplexity)\b/i;

describe('Metodoloji kaynakçası', () => {
  it('şartnamedeki 4 kaynak sırasıyla yer alır', () => {
    expect(ACADEMIC_REFERENCES).toHaveLength(4);
    expect(ACADEMIC_REFERENCES[0].title).toContain('Making AI Less Thirsty');
    expect(ACADEMIC_REFERENCES[1].title).toContain('Power Hungry Processing');
    expect(ACADEMIC_REFERENCES[2].authors).toContain('EcoLogits');
    expect(ACADEMIC_REFERENCES[3].authors).toContain('International Energy Agency');
  });

  it('hiçbir alanda ticari yapay zeka marka adı geçmez', () => {
    for (const ref of ACADEMIC_REFERENCES) {
      for (const value of Object.values(ref)) {
        expect(String(value)).not.toMatch(YASAKLI);
      }
    }
  });
});
