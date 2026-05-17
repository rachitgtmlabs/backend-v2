import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { AmendmentAnalysisController } from './amendment-analysis.controller';
import { AmendmentAnalysisService } from './amendment-analysis.service';
import { GroqAmendmentAnalysisService } from './groq-amendment-analysis.service';
import { OcrExtractionBridgeService } from '../lease-analysis/ocr-extraction-bridge.service';

@Module({
  imports: [PropertyModule],
  controllers: [AmendmentAnalysisController],
  providers: [
    OcrExtractionBridgeService,
    GroqAmendmentAnalysisService,
    AmendmentAnalysisService,
  ],
})
export class AmendmentAnalysisModule {}
