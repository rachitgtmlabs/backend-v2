import { DraftedAmendmentDto } from './drafted-amendment.dto';
export declare class CreateLeaseDto {
    portfolio_id: string;
    property_id: string;
    unit_id?: string;
    status: 'draft' | 'processed';
    document_type: 'main lease' | 'amendment';
    file_name: string;
    lease_information: Record<string, unknown>;
    analysis: Record<string, unknown>;
    gcs_document_path?: string;
    drafted_amendments?: DraftedAmendmentDto[];
}
