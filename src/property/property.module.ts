import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { GcsThumbnailService } from './gcs-thumbnail.service';
import { PropertyController } from './property.controller';
import { PropertyService } from './property.service';
import { Property, PropertySchema } from './schemas/property.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Property.name, schema: PropertySchema },
    ]),
    PortfolioModule,
  ],
  controllers: [PropertyController],
  providers: [PropertyService, GcsThumbnailService],
  exports: [PropertyService],
})
export class PropertyModule {}
