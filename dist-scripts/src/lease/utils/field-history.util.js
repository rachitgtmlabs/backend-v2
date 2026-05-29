"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRACKED_FIELDS = void 0;
exports.buildFieldHistory = buildFieldHistory;
const deep_merge_util_1 = require("./deep-merge.util");
exports.TRACKED_FIELDS = [
    { path: 'executiveIdentity.leaseInformation.lease', label: 'Lease', group: 'Identity', category: 'other' },
    { path: 'executiveIdentity.leaseInformation.property', label: 'Property', group: 'Identity', category: 'other' },
    { path: 'executiveIdentity.leaseInformation.tenant', label: 'Tenant', group: 'Identity', category: 'party' },
    { path: 'executiveIdentity.leaseInformation.landlord', label: 'Landlord', group: 'Identity', category: 'party' },
    { path: 'executiveIdentity.leaseInformation.leaseFrom', label: 'Lease Start', group: 'Term', category: 'term' },
    { path: 'executiveIdentity.leaseInformation.leaseTo', label: 'Lease End', group: 'Term', category: 'term' },
    { path: 'executiveIdentity.leaseInformation.renewalOptions', label: 'Renewal Options', group: 'Term', category: 'term' },
    { path: 'executiveIdentity.leaseInformation.squareFeet', label: 'Square Feet', group: 'Space', category: 'operational' },
    { path: 'executiveIdentity.leaseInformation.rentPerSqFt', label: 'Rent / Sq Ft', group: 'Financial', category: 'financial' },
    { path: 'executiveIdentity.leaseInformation.baseRent', label: 'Annual Base Rent', group: 'Financial', category: 'financial' },
    { path: 'executiveIdentity.leaseInformation.securityDeposit', label: 'Security Deposit', group: 'Financial', category: 'financial' },
];
const TRACKED_BY_PATH = new Map(exports.TRACKED_FIELDS.map((f) => [f.path, f]));
function buildFieldHistory(input) {
    const { leaseId, originalAnalysis, originalEffectiveDate, amendments, originalDraftedAddendums, } = input;
    const snapshots = [
        {
            sourceDocId: 'original',
            sourceLabel: 'Original Lease',
            effectiveDate: originalEffectiveDate,
            analysis: originalAnalysis ?? {},
        },
    ];
    let cursor = originalAnalysis ?? {};
    for (const amd of amendments) {
        if (amd.analysisDelta) {
            cursor = (0, deep_merge_util_1.deepMerge)(cursor, amd.analysisDelta);
        }
        snapshots.push({
            sourceDocId: amd.amendmentId,
            sourceLabel: `Amendment ${amd.version}`,
            effectiveDate: amd.effectiveDate,
            analysis: cursor,
        });
    }
    const fieldHistories = {};
    for (const tracked of exports.TRACKED_FIELDS) {
        const versions = [];
        let lastValueKey = null;
        for (let i = 0; i < snapshots.length; i++) {
            const snap = snapshots[i];
            const leafSnap = snapshots[i];
            const leafSource = i === 0 ? snapshots[0] : snapshots[i];
            const leafField = readLeafField(snap.analysis, tracked.path);
            if (!leafField)
                continue;
            const valueKey = stableValueKey(leafField);
            if (valueKey === lastValueKey)
                continue;
            versions.push({
                version: i,
                sourceDocId: leafSource.sourceDocId,
                sourceLabel: leafSource.sourceLabel,
                effectiveDate: leafSource.effectiveDate,
                displayValue: leafField.displayValue,
                rawValue: leafField.rawValue,
                citation: leafField.citation,
            });
            lastValueKey = valueKey;
            void leafSnap;
        }
        if (versions.length > 0) {
            fieldHistories[tracked.path] = {
                fieldPath: tracked.path,
                fieldLabel: tracked.label,
                group: tracked.group,
                versions,
            };
        }
    }
    const versionsMeta = [
        {
            version: 0,
            sourceDocId: 'original',
            sourceLabel: 'Original Lease',
            effectiveDate: originalEffectiveDate,
            changedFieldPaths: [],
            category: 'other',
            kind: 'lease',
            sortKey: 0,
        },
    ];
    if (originalDraftedAddendums && originalDraftedAddendums.length > 0) {
        versionsMeta.push(...buildDraftedAddendumEntries(originalDraftedAddendums, 0, undefined));
    }
    for (let i = 0; i < amendments.length; i++) {
        const amd = amendments[i];
        const version = i + 1;
        const changedPaths = [];
        const changedTracked = [];
        for (const tracked of exports.TRACKED_FIELDS) {
            const hist = fieldHistories[tracked.path];
            if (!hist)
                continue;
            if (hist.versions.some((v) => v.version === version)) {
                changedPaths.push(tracked.path);
                changedTracked.push(tracked);
            }
        }
        versionsMeta.push({
            version,
            sourceDocId: amd.amendmentId,
            sourceLabel: `Amendment ${amd.version}`,
            effectiveDate: amd.effectiveDate,
            changedFieldPaths: changedPaths,
            category: dominantCategory(changedTracked),
            annotation: buildAnnotation(fieldHistories, changedTracked, version),
            kind: 'amendment',
            sortKey: version,
            editedBy: typeof amd.editedBy === 'string' && amd.editedBy.length > 0
                ? amd.editedBy
                : undefined,
        });
        if (amd.draftedAddendums && amd.draftedAddendums.length > 0) {
            versionsMeta.push(...buildDraftedAddendumEntries(amd.draftedAddendums, version, amd.amendmentId));
        }
    }
    versionsMeta.sort((a, b) => {
        const ak = a.sortKey ?? a.version;
        const bk = b.sortKey ?? b.version;
        return ak - bk;
    });
    return {
        leaseId,
        versions: versionsMeta,
        fieldHistories,
    };
}
function buildDraftedAddendumEntries(drafts, parentVersion, parentAmendmentId) {
    return drafts.map((d, idx) => {
        const sortKey = parentVersion + (idx + 1) / 1000;
        const truncatedTitle = (d.riskTitle ?? 'Drafted addendum').slice(0, 40).trim();
        return {
            version: parentVersion,
            sourceDocId: `draft:${d.key}`,
            sourceLabel: `Draft: ${truncatedTitle}`,
            effectiveDate: d.generatedAt,
            changedFieldPaths: [],
            category: 'other',
            annotation: d.resolutionLabel || undefined,
            kind: 'drafted_addendum',
            sortKey,
            markdown: d.markdown,
            draftRef: {
                amendmentId: parentAmendmentId,
                draftKey: d.key,
            },
        };
    });
}
function readLeafField(tree, path) {
    const parts = path.split('.');
    let node = tree;
    for (const p of parts) {
        if (node === null || typeof node !== 'object' || Array.isArray(node))
            return null;
        node = node[p];
        if (node === undefined)
            return null;
    }
    if (node === null || node === undefined)
        return null;
    if (typeof node === 'object' && !Array.isArray(node)) {
        const obj = node;
        const displayValue = typeof obj.value === 'string'
            ? obj.value
            : typeof obj.amount === 'string'
                ? obj.amount
                : '';
        if (displayValue === '' || displayValue == null) {
            return null;
        }
        const pageRef = obj.pageReference;
        const citationStr = typeof obj.citation === 'string' ? obj.citation : '';
        return {
            displayValue,
            rawValue: obj.value ?? obj.amount,
            citation: {
                page: typeof pageRef?.page === 'number' && pageRef.page > 0 ? pageRef.page : parsePageFromCitation(citationStr),
                section: pageRef?.section ?? undefined,
                highlightText: pageRef?.highlightText ?? undefined,
            },
        };
    }
    return null;
}
function parsePageFromCitation(s) {
    const m = s.match(/(?:p\.?|page)?\s*(\d{1,4})/i);
    return m ? parseInt(m[1], 10) : 1;
}
function stableValueKey(leaf) {
    const raw = typeof leaf.rawValue === 'string' || typeof leaf.rawValue === 'number'
        ? String(leaf.rawValue)
        : JSON.stringify(leaf.rawValue ?? null);
    return `${leaf.displayValue}::${raw}`;
}
function dominantCategory(changed) {
    if (changed.length === 0)
        return 'other';
    const counts = new Map();
    for (const f of changed) {
        counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
    }
    const priority = ['party', 'term', 'financial', 'operational', 'other'];
    let best = 'other';
    let bestCount = -1;
    for (const cat of priority) {
        const c = counts.get(cat) ?? 0;
        if (c > bestCount) {
            best = cat;
            bestCount = c;
        }
    }
    return best;
}
function buildAnnotation(histories, changed, atVersion) {
    if (changed.length === 0)
        return undefined;
    const parts = [];
    for (const f of changed.slice(0, 2)) {
        const hist = histories[f.path];
        if (!hist)
            continue;
        const idx = hist.versions.findIndex((v) => v.version === atVersion);
        if (idx <= 0) {
            parts.push(`new ${f.label.toLowerCase()}`);
            continue;
        }
        const prev = hist.versions[idx - 1];
        const cur = hist.versions[idx];
        parts.push(compactDelta(f.label, prev.displayValue, cur.displayValue));
    }
    if (changed.length > 2)
        parts.push(`+${changed.length - 2} more`);
    return parts.join(' · ');
}
function compactDelta(label, prev, cur) {
    const prevNum = extractNumber(prev);
    const curNum = extractNumber(cur);
    if (prevNum !== null && curNum !== null && prevNum !== curNum) {
        const sign = curNum > prevNum ? '+' : '−';
        const delta = Math.abs(curNum - prevNum);
        return `${sign}${formatCompactNumber(delta)} ${label.toLowerCase()}`;
    }
    return `${label}: ${truncate(cur, 18)}`;
}
function extractNumber(s) {
    const m = s.replace(/[,$ ]/g, '').match(/-?\d+(\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
}
function formatCompactNumber(n) {
    if (n >= 1_000_000)
        return `$${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000)
        return `$${Math.round(n / 1_000)}k`;
    return `$${Math.round(n)}`;
}
function truncate(s, max) {
    if (s.length <= max)
        return s;
    return s.slice(0, max - 1) + '…';
}
//# sourceMappingURL=field-history.util.js.map