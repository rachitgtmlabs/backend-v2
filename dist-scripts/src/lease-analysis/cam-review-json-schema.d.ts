export declare const CAM_REVIEW_JSON_SCHEMA: {
    readonly type: "object";
    readonly properties: {
        readonly ambiguities: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly description: {
                        readonly type: "string";
                    };
                    readonly location: {
                        readonly type: "string";
                    };
                    readonly potentialIssue: {
                        readonly type: "string";
                    };
                    readonly recommendedAction: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["description", "location", "potentialIssue", "recommendedAction"];
                readonly additionalProperties: false;
            };
        };
        readonly conflicts: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly description: {
                        readonly type: "string";
                    };
                    readonly conflictingProvisions: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "string";
                        };
                    };
                    readonly potentialResolution: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["description", "conflictingProvisions", "potentialResolution"];
                readonly additionalProperties: false;
            };
        };
        readonly missingProvisions: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly provisionType: {
                        readonly type: "string";
                    };
                    readonly significance: {
                        readonly type: "string";
                        readonly enum: readonly ["Low", "Medium", "High"];
                    };
                    readonly tenantRisk: {
                        readonly type: "string";
                    };
                };
                readonly required: readonly ["provisionType", "significance", "tenantRisk"];
                readonly additionalProperties: false;
            };
        };
        readonly tenantConcerns: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly concernType: {
                        readonly type: "string";
                    };
                    readonly description: {
                        readonly type: "string";
                    };
                    readonly riskLevel: {
                        readonly type: "string";
                        readonly enum: readonly ["Low", "Medium", "High", "Critical"];
                    };
                };
                readonly required: readonly ["concernType", "description", "riskLevel"];
                readonly additionalProperties: false;
            };
        };
        readonly camRules: {
            readonly type: "array";
            readonly items: {
                readonly type: "object";
                readonly properties: {
                    readonly ruleId: {
                        readonly type: "string";
                    };
                    readonly pageNumber: {
                        readonly type: "integer";
                    };
                    readonly ruleText: {
                        readonly type: "string";
                    };
                    readonly ruleCategory: {
                        readonly type: "string";
                        readonly enum: readonly ["proportionateShare", "camExpenseCategories", "exclusions", "paymentTerms", "capsLimitations", "reconciliationProcedures", "baseYearProvisions", "grossUpProvisions", "administrativeFees", "auditRights", "noticeRequirements", "controllableVsNonControllable", "definitions", "calculationMethods"];
                    };
                    readonly confidenceScore: {
                        readonly type: "number";
                    };
                    readonly sourcePages: {
                        readonly type: "array";
                        readonly items: {
                            readonly type: "integer";
                        };
                    };
                };
                readonly required: readonly ["ruleId", "pageNumber", "ruleText", "ruleCategory", "confidenceScore", "sourcePages"];
                readonly additionalProperties: false;
            };
        };
        readonly flagsAndObservations: {
            readonly type: "object";
            readonly properties: {
                readonly ambiguities: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly conflicts: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly missingProvisions: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly tenantConcerns: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
            };
            readonly required: readonly ["ambiguities", "conflicts", "missingProvisions", "tenantConcerns"];
            readonly additionalProperties: false;
        };
        readonly summary: {
            readonly type: "object";
            readonly properties: {
                readonly totalRulesExtracted: {
                    readonly type: "integer";
                };
                readonly rulesByCategory: {
                    readonly type: "object";
                    readonly properties: {
                        readonly proportionateShare: {
                            readonly type: "integer";
                        };
                        readonly camExpenseCategories: {
                            readonly type: "integer";
                        };
                        readonly exclusions: {
                            readonly type: "integer";
                        };
                        readonly paymentTerms: {
                            readonly type: "integer";
                        };
                        readonly capsLimitations: {
                            readonly type: "integer";
                        };
                        readonly reconciliationProcedures: {
                            readonly type: "integer";
                        };
                        readonly baseYearProvisions: {
                            readonly type: "integer";
                        };
                        readonly grossUpProvisions: {
                            readonly type: "integer";
                        };
                        readonly administrativeFees: {
                            readonly type: "integer";
                        };
                        readonly auditRights: {
                            readonly type: "integer";
                        };
                        readonly noticeRequirements: {
                            readonly type: "integer";
                        };
                        readonly controllableVsNonControllable: {
                            readonly type: "integer";
                        };
                        readonly definitions: {
                            readonly type: "integer";
                        };
                        readonly calculationMethods: {
                            readonly type: "integer";
                        };
                    };
                    readonly required: readonly ["proportionateShare", "camExpenseCategories", "exclusions", "paymentTerms", "capsLimitations", "reconciliationProcedures", "baseYearProvisions", "grossUpProvisions", "administrativeFees", "auditRights", "noticeRequirements", "controllableVsNonControllable", "definitions", "calculationMethods"];
                    readonly additionalProperties: false;
                };
                readonly overallTenantRiskAssessment: {
                    readonly type: "string";
                    readonly enum: readonly ["Low", "Medium", "High", "Critical"];
                };
                readonly keyTenantProtections: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
                readonly keyTenantExposures: {
                    readonly type: "array";
                    readonly items: {
                        readonly type: "string";
                    };
                };
            };
            readonly required: readonly ["totalRulesExtracted", "rulesByCategory", "overallTenantRiskAssessment", "keyTenantProtections", "keyTenantExposures"];
            readonly additionalProperties: false;
        };
    };
    readonly required: readonly ["ambiguities", "conflicts", "missingProvisions", "tenantConcerns", "camRules", "flagsAndObservations", "summary"];
    readonly additionalProperties: false;
};
export declare const CAM_REVIEW_SCHEMA_NAME = "cam_lease_review";
export declare const CAM_REVIEW_SCHEMA_DESCRIPTION: string;
