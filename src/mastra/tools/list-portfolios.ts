import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { getDb } from '../lib/mongo';
import { orgPortfolioFilter, getOrgId } from '../lib/rbac';

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
  execute: async (_inputData, context) => {
    try {
      const orgId = getOrgId(context);
      const db = await getDb();
      const portfolios = await db
        .collection('portfolios')
        .find(orgPortfolioFilter(orgId))
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
