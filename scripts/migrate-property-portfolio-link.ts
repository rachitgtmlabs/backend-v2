/**
 * One-time data fix: legacy property documents may only have `portfolioId` (camelCase).
 * This API uses `portfolio_id` everywhere; counts and some queries require the snake_case field.
 *
 * Run from lease-backend-v2 (loads `.env` from this package root):
 *   npm run migrate:property-portfolio-link
 */
import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const uri =
  process.env.MONGODB_URI?.trim() ||
  'mongodb://127.0.0.1:27017/lease_iq';

function maskUri(u: string): string {
  try {
    const parsed = new URL(u);
    if (parsed.username) parsed.username = '***';
    if (parsed.password) parsed.password = '***';
    return parsed.toString();
  } catch {
    return u.replace(/:\/\/[^/]+@/, '://***@');
  }
}

async function main() {
  await mongoose.connect(uri);
  const coll = mongoose.connection.collection('properties');

  const legacyFilter = {
    portfolioId: { $exists: true, $nin: [null, ''] },
    $or: [
      { portfolio_id: { $exists: false } },
      { portfolio_id: null },
      { portfolio_id: '' },
    ],
  };

  const propertiesTotal = await coll.countDocuments({});
  const needLink = await coll.countDocuments(legacyFilter);

  const sample = await coll.findOne({});
  const sampleKeys =
    sample && typeof sample === 'object' ? Object.keys(sample) : [];

  const result = await coll.updateMany(legacyFilter, [
    { $set: { portfolio_id: '$portfolioId' } },
  ]);

  console.log(
    JSON.stringify(
      {
        uri: maskUri(uri),
        propertiesCollectionCount: propertiesTotal,
        documentsMatchingLegacyCamelCaseOnly: needLink,
        matchedCount: result.matchedCount,
        modifiedCount: result.modifiedCount,
        sampleDocumentKeys: sampleKeys,
      },
      null,
      2,
    ),
  );

  const portfolioColl = mongoose.connection.collection('portfolios');
  const portfolioIds = (
    await portfolioColl.find({}).project({ portfolioId: 1 }).toArray()
  ).map((d) => String(d.portfolioId ?? ''));

  const distinctPropertyPortfolioIds = (
    await coll.distinct('portfolio_id', {
      portfolio_id: { $exists: true, $nin: [null, ''] },
    })
  ).map((id) => String(id));

  const orphanPortfolioIds = distinctPropertyPortfolioIds.filter(
    (p) => p && !portfolioIds.includes(p),
  );
  const portfoliosWithNoPropertyRow = portfolioIds.filter(
    (p) => p && !distinctPropertyPortfolioIds.includes(p),
  );

  console.log(
    JSON.stringify(
      {
        portfolioDocuments: portfolioIds.length,
        distinctPortfolioIdOnProperties: distinctPropertyPortfolioIds.length,
        portfolioIdsWithNoMatchingPropertyDoc: portfoliosWithNoPropertyRow,
        propertyPortfolioIdsUnknownToPortfoliosCollection: orphanPortfolioIds,
      },
      null,
      2,
    ),
  );

  if (propertiesTotal === 0) {
    console.log(
      '\nNo documents in `properties`. If your data is elsewhere, check MONGODB_URI in .env matches the API and the database name.',
    );
  } else if (needLink === 0 && portfoliosWithNoPropertyRow.length > 0) {
    console.log(
      '\nMigration skipped: portfolio_id is already set on properties. The UI shows 0 because no property row uses the same id as these portfolios:',
      portfoliosWithNoPropertyRow.join(', ') || '(none)',
    );
  } else if (needLink === 0) {
    console.log(
      '\nNothing to migrate: legacy camelCase-only rows not found. If counts are still wrong in the app, confirm the frontend uses this same MONGODB_URI and restart the API.',
    );
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
