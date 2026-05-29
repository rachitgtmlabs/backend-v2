import { Module } from '@nestjs/common';
import { PropertyModule } from '../property/property.module';
import { GroqLeaseAnalysisService } from './groq-lease-analysis.service';
import { LeaseAnalysisController } from './lease-analysis.controller';
import { LeaseAnalysisService } from './lease-analysis.service';
import { OcrExtractionBridgeService } from './ocr-extraction-bridge.service';

@Module({
  imports: [PropertyModule],
  controllers: [LeaseAnalysisController],
  providers: [
    OcrExtractionBridgeService,
    GroqLeaseAnalysisService,
    LeaseAnalysisService,
  ],
  // Exported so CamModule can reuse the OCR bridge for bill uploads.
  exports: [OcrExtractionBridgeService],
})
export class LeaseAnalysisModule {}
