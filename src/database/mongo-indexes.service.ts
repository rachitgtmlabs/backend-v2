import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

/**
 * Ensures Mongoose-declared indexes exist on each registered model.
 * Uses createIndexes() (additive); does not drop stray DB indexes (unlike syncIndexes).
 */
@Injectable()
export class MongoIndexesService implements OnModuleInit {
  private readonly logger = new Logger(MongoIndexesService.name);

  constructor(@InjectConnection() private readonly connection: Connection) {}

  async onModuleInit(): Promise<void> {
    const models = Object.values(this.connection.models);
    if (models.length === 0) {
      this.logger.warn('No Mongoose models registered; skipping index ensure');
      return;
    }

    await Promise.all(models.map((model) => model.syncIndexes()));

    const collections = models
      .map((m) => `${m.modelName}(${m.collection.collectionName})`)
      .sort()
      .join(', ');
    this.logger.log(`MongoDB indexes ensured: ${collections}`);
  }
}
