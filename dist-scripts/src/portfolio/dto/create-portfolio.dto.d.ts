export declare class ClassificationDto {
    property_type: string;
}
export declare class LocaleDto {
    timezone: string;
    currency: string;
    measurement_system: string;
}
export declare class StakeholderDto {
    id: string;
    name: string;
    role: string;
}
export declare class DocumentRequirementDto {
    id?: string;
    document_type: string;
    requirement_level: string;
}
export declare class AttributesDto {
    custom_fields?: Record<string, unknown>;
    source?: string;
}
export declare class PortfolioPayloadDto {
    name: string;
    description?: string;
    classification: ClassificationDto;
    locale: LocaleDto;
    stakeholders: StakeholderDto[];
    document_requirements: DocumentRequirementDto[];
    tags: string[];
    attributes?: AttributesDto;
}
export declare class CreatePortfolioDto {
    portfolio: PortfolioPayloadDto;
}
