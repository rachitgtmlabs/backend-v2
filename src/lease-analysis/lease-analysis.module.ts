import { Module } from '@nestjs/common';
import { GroqLeaseAnalysisService } from './groq-lease-analysis.service';
import { LeaseAnalysisController } from './lease-analysis.controller';
import { LeaseAnalysisService } from './lease-analysis.service';
import { OcrExtractionBridgeService } from './ocr-extraction-bridge.service';

@Module({
  controllers: [LeaseAnalysisController],
  providers: [
    OcrExtractionBridgeService,
    GroqLeaseAnalysisService,
    LeaseAnalysisService,
  ],
})
export class LeaseAnalysisModule {}
