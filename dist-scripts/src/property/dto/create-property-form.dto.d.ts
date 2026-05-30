export declare enum PropertyTypeValue {
    commercial = "commercial",
    residential = "residential",
    mixed_use = "mixed_use",
    industrial = "industrial"
}
export declare class CreatePropertyFormDto {
    property_name: string;
    address: string;
    portfolio_id: string;
    property_type: PropertyTypeValue;
}
