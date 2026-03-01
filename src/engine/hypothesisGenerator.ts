/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenAI, Type } from "@google/genai";
import { LogicRule, ZoneState } from '../types';

export class HypothesisGenerator {
  private templates = [
    {
      head: 'Vulnerable(z)',
      body: ['EnemyPresence(z)', 'LowDefense(z)'],
      description: 'A zone is vulnerable if enemy is present and our defense is low.',
      stratum: 1
    },
    {
      head: 'HighValue(z)',
      body: ['StrategicValue(z)', 'SupplyRich(z)'],
      description: 'A zone is high value if it has strategic importance and many supplies.',
      stratum: 1
    },
    {
      head: 'Reinforce(z)',
      body: ['Vulnerable(z)', 'SupplyAvailable(z)'],
      description: 'Reinforce a zone if it is vulnerable and supplies are available.',
      stratum: 2
    },
    {
      head: 'Evacuate(z)',
      body: ['Vulnerable(z)', 'p_attack_high(z)'],
      description: 'Evacuate if a zone is vulnerable and attack probability is high.',
      stratum: 2
    },
    {
      head: 'Execute(Reinforce, z)',
      body: ['Reinforce(z)', 'NoFog(z)'],
      description: 'Execute reinforcement if recommended and visibility is clear.',
      stratum: 3
    }
  ];

  public generateHypothesis(existingRules: LogicRule[]): LogicRule {
    // Pick a template not already in existing rules (by head/body signature)
    const unusedTemplates = this.templates.filter(t => 
      !existingRules.some(r => r.head === t.head && JSON.stringify(r.body) === JSON.stringify(t.body))
    );

    const template = unusedTemplates.length > 0 
      ? unusedTemplates[Math.floor(Math.random() * unusedTemplates.length)]
      : this.templates[Math.floor(Math.random() * this.templates.length)];

    return {
      id: `H_${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
      head: template.head,
      body: template.body,
      probability: 0.7 + Math.random() * 0.25,
      stratum: template.stratum,
      description: `[LLoM Proposed] ${template.description}`
    };
  }

  public async generateFromLLM(zones: ZoneState[], existingRules: LogicRule[]): Promise<LogicRule> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not found, falling back to simulation.");
      return this.generateHypothesis(existingRules);
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = `
      Current Battlefield State:
      ${JSON.stringify(zones.map(z => ({ name: z.name, ours: z.ours, enemy: z.enemy, supply: z.supply, p_attack: z.p_attack, p_success: z.p_success })), null, 2)}

      Existing Rules:
      ${JSON.stringify(existingRules.map(r => ({ head: r.head, body: r.body })), null, 2)}

      Task: Propose a NEW tactical logic rule in Datalog-style (Head ← Body) that helps the commander.
      The rule must be range-restricted (all variables in head must be in body).
      Available predicates for body: EnemyPresence(z), LowDefense(z), StrategicValue(z), SupplyRich(z), p_attack_high(z), p_success_high(z), NoFog(z), Vulnerable(z), HighValue(z), Reinforce(z).
      Available variables: z (representing a zone).
    `;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
        config: {
          systemInstruction: "You are a tactical AI reasoning expert. Propose a new logic rule for a battlefield simulation. Return ONLY a JSON object matching the LogicRule interface.",
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              head: { type: Type.STRING, description: "The head of the rule, e.g. 'Attack(z)'" },
              body: { type: Type.ARRAY, items: { type: Type.STRING }, description: "List of body literals, e.g. ['Vulnerable(z)', 'HighValue(z)']" },
              probability: { type: Type.NUMBER, description: "Confidence score between 0 and 1" },
              stratum: { type: Type.INTEGER, description: "Stratum level (1, 2, or 3)" },
              description: { type: Type.STRING, description: "A brief explanation of the rule's tactical intent" }
            },
            required: ["head", "body", "probability", "stratum", "description"]
          }
        }
      });

      const result = JSON.parse(response.text || '{}');
      return {
        ...result,
        id: `LLM_${Math.random().toString(36).substr(2, 4).toUpperCase()}`,
        description: `[Gemini Proposed] ${result.description}`
      };
    } catch (error) {
      console.error("Gemini hypothesis generation failed:", error);
      return this.generateHypothesis(existingRules);
    }
  }
}
