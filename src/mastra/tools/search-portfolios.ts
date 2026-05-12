import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import mongoose from 'mongoose';

const connectionString =
  process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/lease_iq';

let cachedConnection: typeof mongoose | null = null;

async function getConnection() {
  if (cachedConnection?.connection?.readyState === 1) {
    return cachedConnection;
  }

  cachedConnection = await mongoose.connect(connectionString);
  return cachedConnection;
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

function classificationLabel(doc: Record<string, unknown>): string | undefined {
  const c = doc.classification;
  if (c && typeof c === 'object' && c !== null && 'property_type' in c) {
    const pt = (c as { property_type?: unknown }).property_type;
    if (typeof pt === 'string' && pt.trim()) return pt.trim();
  }
  return undefined;
}

function scoreMatch(
  name: string,
  description: string,
  query: string,
): number {
  const n = normalize(name);
  const d = normalize(description);
  const q = normalize(query);
  if (!q) return 0;

  if (n === q) return 100;
  if (n.includes(q)) return 90;
  if (d.includes(q)) return 55;

  const qWords = q.split(' ').filter((w) => w.length > 0);
  if (qWords.length === 0) return 0;

  if (qWords.every((w) => n.includes(w))) return 75;
  if (qWords.every((w) => n.includes(w) || d.includes(w))) return 60;

  let score = 0;
  for (const w of qWords) {
    if (w.length < 2) continue;
    if (n.includes(w)) score += 35;
    else if (d.includes(w)) score += 15;
  }
  return score;
}

export const searchPortfoliosTool = createTool({
  id: 'search-portfolios',
  description: `Search portfolios by name or description using the user's wording (partial match, case-insensitive).
Prefer this over list-portfolios when the user mentions a specific portfolio name or phrase.
Returns ranked matches so you can disambiguate: if several match, ask the user which option to use before loading properties or leases.`,
  inputSchema: z.object({
    query: z
      .string()
      .min(1)
      .describe(
        'Phrase or name the user gave (e.g. "Silverline", "Silverline Portfolio", "retail fund").',
      ),
    limit: z
      .number()
      .int()
      .min(1)
      .max(25)
      .optional()
      .describe('Max results (default 15).'),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    query: z.string().optional(),
    matches: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          classification: z.string().optional(),
          matchScore: z.number().optional(),
        }),
      )
      .optional(),
    totalPortfoliosScanned: z.number().optional(),
    error: z.string().optional(),
  }),
  execute: async (inputData) => {
    const rawQuery = inputData.query.trim();
    const limit = inputData.limit ?? 15;

    if (!rawQuery) {
      return { success: false, error: 'Search query cannot be empty.' };
    }

    try {
      const conn = await getConnection();
      const db = conn.connection.db;
      if (!db) {
        return { success: false, error: 'Database connection not available' };
      }

      const portfoliosCollection = db.collection('portfolios');
      const rows = await portfoliosCollection
        .find({})
        .project({
          portfolioId: 1,
          name: 1,
          description: 1,
          classification: 1,
        })
        .toArray();

      type Row = {
        id: string;
        name: string;
        description?: string;
        classification?: string;
        matchScore: number;
      };

      const scored: Row[] = [];

      for (const p of rows) {
        const doc = p as Record<string, unknown>;
        const name = String(doc.name ?? '');
        const desc = String(doc.description ?? '');
        const id = String(doc.portfolioId ?? '');
        if (!id || !name) continue;

        const score = scoreMatch(name, desc, rawQuery);
        if (score < 20) continue;

        scored.push({
          id,
          name,
          ...(desc ? { description: desc } : {}),
          classification: classificationLabel(doc),
          matchScore: score,
        });
      }

      scored.sort((a, b) => b.matchScore - a.matchScore);

      const matches = scored.slice(0, limit);

      return {
        success: true,
        query: rawQuery,
        matches,
        totalPortfoliosScanned: rows.length,
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to search portfolios: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
