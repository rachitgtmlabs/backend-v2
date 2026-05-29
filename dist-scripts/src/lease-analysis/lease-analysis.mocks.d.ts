export type LeaseAnalysisSection = 'executiveSummary' | 'executiveIdentity' | 'spaceAndPremises' | 'financialStack' | 'criticalDeadlines' | 'operationalGuardrails' | 'legalNuances';
export declare const MOCK_EXECUTIVE_SUMMARY: {
    value: string;
    citation: string;
};
export declare const MOCK_EXECUTIVE_IDENTITY: {
    leaseInformation: {
        lease: {
            value: string;
            citation: string;
            amendments: string[];
        };
        property: {
            value: string;
            citation: string;
            amendments: string[];
        };
        leaseFrom: {
            value: string;
            citation: string;
            amendments: string[];
        };
        leaseTo: {
            value: string;
            citation: string;
            amendments: string[];
        };
        squareFeet: {
            value: string;
            citation: string;
            amendments: string[];
        };
        baseRent: {
            value: string;
            citation: string;
            amendments: string[];
        };
        securityDeposit: {
            value: string;
            citation: string;
            amendments: string[];
        };
        renewalOptions: {
            value: string;
            citation: string;
            amendments: string[];
        };
    };
};
export declare const MOCK_SPACE_AND_PREMISES: {
    unit: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    building: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    premises: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    zipCode: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    city: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    state: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    areaRentable: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    areaUsable: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    commonArea: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    parking: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
        type: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
    };
    storageArea: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    status: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
    notes: {
        value: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
        amendments: string[];
    };
};
export declare const MOCK_FINANCIAL_STACK: {
    summaryCards: {
        title: string;
        numericValue: number;
        valueUnit: string;
        citation: string;
    }[];
    rentSchedule: {
        period: string;
        monthlyRent: string;
        annualRent: string;
        notes: string;
    }[];
    additionalCharges: {
        label: string;
        amount: string;
    }[];
    lateFees: {
        calculationType: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        graceDays: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        percent: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        secondFeeCalculationType: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        secondFeeGrace: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        secondFeePercent: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        perDayFee: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
    };
};
export declare const MOCK_CRITICAL_DEADLINES: {
    riskSummary: {
        high: number;
        medium: number;
        low: number;
    };
    milestones: {
        title: string;
        date: string;
        severity: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
    }[];
    risks: {
        title: string;
        severity: string;
        contextSummary: string;
        sectionReference: string;
        analysisText: string;
        citation: string;
        pageReference: {
            page: number;
            section: string;
            highlightText: string;
        };
    }[];
};
export declare const MOCK_OPERATIONAL_GUARDRAILS: {
    use: {
        synopsis: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        keyParameters: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        narrative: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        certainty: string;
    };
    alterations: {
        synopsis: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        keyParameters: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        narrative: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        certainty: string;
    };
    services: {
        synopsis: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        keyParameters: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        narrative: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        certainty: string;
    };
    signs: {
        synopsis: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        keyParameters: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        narrative: {
            value: string;
            citation: string;
            pageReference: {
                page: number;
                section: string;
                highlightText: string;
            };
            amendments: string[];
        };
        certainty: string;
    };
};
export declare const MOCK_LEGAL_NUANCES: {
    riskRegister: {
        counts: {
            high: number;
            medium: number;
            low: number;
        };
        overallCertainty: string;
        sections: {
            sectionName: string;
            issues: {
                category: string;
                issueDescription: string;
                affectedClause: string;
                citation: string;
                pageReference: {
                    page: number;
                    section: string;
                    highlightText: string;
                };
                certaintyLevel: string;
                recommendedAction: string;
            }[];
        }[];
    };
};
export declare const STREAM_SECTION_ORDER: LeaseAnalysisSection[];
export declare function getMockForSection(section: LeaseAnalysisSection): unknown;
