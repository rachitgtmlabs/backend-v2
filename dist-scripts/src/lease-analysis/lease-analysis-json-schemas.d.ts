import type { LeaseAnalysisSection } from './lease-analysis.mocks';
export declare const operationalGuardrailsASchema: {
    readonly type: "object";
    readonly properties: {
        readonly use: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly alterations: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly services: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly signs: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly premisesAndTerm: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly holdover: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly expansionAndRelocation: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly rightOfFirstRefusalOffer: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly taxes: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly operatingExpenses: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly insurance: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly brokerage: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly repairsAndMaintenance: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly parking: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
    };
    readonly required: readonly ["use", "alterations", "services", "signs", "premisesAndTerm", "holdover", "expansionAndRelocation", "rightOfFirstRefusalOffer", "taxes", "operatingExpenses", "insurance", "brokerage", "repairsAndMaintenance", "parking"];
    readonly additionalProperties: false;
};
export declare const operationalGuardrailsBSchema: {
    readonly type: "object";
    readonly properties: {
        readonly hazardousMaterials: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly rulesAndRegulations: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly landlordsRightOfEntry: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly quietEnjoyment: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly assignmentAndSubletting: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly defaultAndRemedies: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly landlordDefault: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly casualty: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly condemnation: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly liabilityAndIndemnification: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly liens: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly notices: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly estoppel: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
        readonly subordination: {
            readonly type: "object";
            readonly properties: {
                readonly synopsis: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly keyParameters: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly narrative: {
                    readonly type: "object";
                    readonly properties: {
                        readonly value: {
                            readonly type: "string";
                        };
                        readonly citation: {
                            readonly type: "string";
                        };
                        readonly pageReference: {
                            readonly type: "object";
                            readonly properties: {
                                readonly page: {
                                    readonly type: "number";
                                };
                                readonly section: {
                                    readonly type: "string";
                                };
                                readonly highlightText: {
                                    readonly type: "string";
                                };
                            };
                            readonly required: readonly ["page", "section", "highlightText"];
                            readonly additionalProperties: false;
                        };
                        readonly amendments: {
                            readonly type: "array";
                            readonly items: {
                                readonly type: "string";
                            };
                        };
                    };
                    readonly required: readonly ["value", "citation", "pageReference", "amendments"];
                    readonly additionalProperties: false;
                };
                readonly certainty: {
                    readonly type: "string";
                    readonly enum: readonly ["low", "medium", "high"];
                };
            };
            readonly required: readonly ["synopsis", "keyParameters", "narrative", "certainty"];
            readonly additionalProperties: false;
        };
    };
    readonly required: readonly ["hazardousMaterials", "rulesAndRegulations", "landlordsRightOfEntry", "quietEnjoyment", "assignmentAndSubletting", "defaultAndRemedies", "landlordDefault", "casualty", "condemnation", "liabilityAndIndemnification", "liens", "notices", "estoppel", "subordination"];
    readonly additionalProperties: false;
};
export declare const OPERATIONAL_GUARDRAILS_TOPIC_KEYS: readonly ["use", "alterations", "services", "signs", "premisesAndTerm", "holdover", "expansionAndRelocation", "rightOfFirstRefusalOffer", "taxes", "operatingExpenses", "insurance", "brokerage", "repairsAndMaintenance", "parking", "hazardousMaterials", "rulesAndRegulations", "landlordsRightOfEntry", "quietEnjoyment", "assignmentAndSubletting", "defaultAndRemedies", "landlordDefault", "casualty", "condemnation", "liabilityAndIndemnification", "liens", "notices", "estoppel", "subordination"];
export type OperationalGuardrailsTopicKey = (typeof OPERATIONAL_GUARDRAILS_TOPIC_KEYS)[number];
export declare const LEASE_ANALYSIS_JSON_SCHEMA: Record<LeaseAnalysisSection, Record<string, unknown>>;
export declare const LEASE_ANALYSIS_SCHEMA_DESCRIPTION: Record<LeaseAnalysisSection, string>;
