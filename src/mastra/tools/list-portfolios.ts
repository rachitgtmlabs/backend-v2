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

export const listPortfoliosTool = createTool({
  id: 'list-portfolios',
  description: `Lists all portfolios (name and id). Use when the user wants the full catalog, or when search-portfolios returns no matches and you need to show what exists. For a name the user gave, prefer search-portfolios first.`,
  inputSchema: z.object({}),
  outputSchema: z.object({
    success: z.boolean(),
    portfolios: z
      .array(
        z.object({
          id: z.string(),
          name: z.string(),
          description: z.string().optional(),
          classification: z.string().optional(),
        }),
      )
      .optional(),
    error: z.string().optional(),
  }),
  execute: async () => {
    try {
      const conn = await getConnection();
      const db = conn.connection.db;

      if (!db) {
        return { success: false, error: 'Database connection not available' };
      }

      const portfoliosCollection = db.collection('portfolios');
      const portfolios = await portfoliosCollection
        .find({})
        .project({
          portfolioId: 1,
          name: 1,
          description: 1,
          classification: 1,
        })
        .toArray();

      return {
        success: true,
        portfolios: portfolios.map((p) => ({
          id: p.portfolioId,
          name: p.name,
          description: p.description,
          classification: p.classification,
        })),
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to list portfolios: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  },
});
