/**
 * Field-level history builder for the lease-evolution Timeline view.
 *
 * Given an original lease analysis blob + ordered amendment deltas, builds a
 * per-field history showing how each tracked scalar field changed across
 * versions, with per-field citations preserved from the existing LeaseField
 * shape.
 *
 * Arrays are intentionally NOT tracked here (rent schedule, milestones, etc.)
 * — those require their own diff semantics and are deferred.
 */
import { deepMerge } from './deep-merge.util';

export type AmendmentCategory =
  | 'financial'
  | 'term'
  | 'party'
  | 'operational'
  | 'other';

interface TrackedField {
  /** Dot path into the analysis tree. */
  path: string;
  /** Human label for display. */
  label: string;
  /** UI grouping. */
  group: string;
  /** Drives the timeline pin color when this field is the dominant change. */
  category: AmendmentCategory;
}

/**
 * v1 tracked-fields registry. Scalar leaf fields only.
 * Extend here when adding new fields to the Timeline.
 */
export const TRACKED_FIELDS: TrackedField[] = [
  // --- Identity (party) ---
  { path: 'executiveIdentity.leaseInformation.lease', label: 'Lease', group: 'Identity', category: 'other' },
  { path: 'executiveIdentity.leaseInformation.property', label: 'Property', group: 'Identity', category: 'other' },
  { path: 'executiveIdentity.leaseInformation.tenant', label: 'Tenant', group: 'Identity', category: 'party' },
  { path: 'executiveIdentity.leaseInformation.landlord', label: 'Landlord', group: 'Identity', category: 'party' },
  // --- Term ---
  { path: 'executiveIdentity.leaseInformation.leaseFrom', label: 'Lease Start', group: 'Term', category: 'term' },
  { path: 'executiveIdentity.leaseInformation.leaseTo', label: 'Lease End', group: 'Term', category: 'term' },
  { path: 'executiveIdentity.leaseInformation.renewalOptions', label: 'Renewal Options', group: 'Term', category: 'term' },
  // --- Space ---
  { path: 'executiveIdentity.leaseInformation.squareFeet', label: 'Square Feet', group: 'Space', category: 'operational' },
  // --- Financial ---
  { path: 'executiveIdentity.leaseInformation.rentPerSqFt', label: 'Rent / Sq Ft', group: 'Financial', category: 'financial' },
  { path: 'executiveIdentity.leaseInformation.baseRent', label: 'Annual Base Rent', group: 'Financial', category: 'financial' },
  { path: 'executiveIdentity.leaseInformation.securityDeposit', label: 'Security Deposit', group: 'Financial', category: 'financial' },
];

const TRACKED_BY_PATH: Map<string, TrackedField> = new Map(
  TRACKED_FIELDS.map((f) => [f.path, f]),
);

// ---------------------------------------------------------------------------
// Types — mirrored to the frontend's `lib/types/amendment-history.ts` shape.
// ---------------------------------------------------------------------------

export interface CitationRef {
  page: number;
  section?: string;
  highlightText?: string;
}

export interface FieldVersionRecord {
  version: number;
  sourceDocId: string;
  sourceLabel: string;
  effectiveDate: string;
  displayValue: string;
  rawValue: unknown;
  citation: CitationRef;
}

export interface FieldHistoryRecord {
  fieldPath: string;
  fieldLabel: string;
  group: string;
  versions: FieldVersionRecord[];
}

export interface AmendmentVersionMetaRecord {
  version: number;
  sourceDocId: string;
  sourceLabel: string;
  effectiveDate: string;
  changedFieldPaths: string[];
  category: AmendmentCategory;
  annotation?: string;
}

export interface FieldHistoryPayload {
  leaseId: string;
  versions: AmendmentVersionMetaRecord[];
  fieldHistories: Record<string, FieldHistoryRecord>;
}

// ---------------------------------------------------------------------------
// Inputs from the lease.service caller.
// ---------------------------------------------------------------------------

export interface AmendmentInput {
  amendmentId: string;
  version: number;
  /** Delta blob — only changed top-level analysis sections. */
  analysisDelta: Record<string, unknown> | undefined;
  /** Falls back to `createdAt` since real data has no separate effective date. */
  effectiveDate: string;
}

export interface BuildFieldHistoryInput {
  leaseId: string;
  originalAnalysis: Record<string, unknown>;
  originalEffectiveDate: string;
  amendments: AmendmentInput[];
}

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------

export function buildFieldHistory(input: BuildFieldHistoryInput): FieldHistoryPayload {
  const { leaseId, originalAnalysis, originalEffectiveDate, amendments } = input;

  // Compute the analysis blob at each version by merging deltas sequentially.
  const snapshots: { sourceDocId: string; sourceLabel: string; effectiveDate: string; analysis: Record<string, unknown> }[] = [
    {
      sourceDocId: 'original',
      sourceLabel: 'Original Lease',
      effectiveDate: originalEffectiveDate,
      analysis: originalAnalysis ?? {},
    },
  ];
  let cursor: Record<string, unknown> = originalAnalysis ?? {};
  for (const amd of amendments) {
    if (amd.analysisDelta) {
      cursor = deepMerge(cursor, amd.analysisDelta);
    }
    snapshots.push({
      sourceDocId: amd.amendmentId,
      sourceLabel: `Amendment ${amd.version}`,
      effectiveDate: amd.effectiveDate,
      analysis: cursor,
    });
  }

  // For each tracked field, walk the snapshots and record every value change.
  const fieldHistories: Record<string, FieldHistoryRecord> = {};
  for (const tracked of TRACKED_FIELDS) {
    const versions: FieldVersionRecord[] = [];
    let lastValueKey: string | null = null;

    for (let i = 0; i < snapshots.length; i++) {
      const snap = snapshots[i];
      const leafSnap = snapshots[i];
      const leafSource = i === 0 ? snapshots[0] : snapshots[i];
      // Where did THIS change come from? When the value differs from the prior
      // snapshot, the source is the amendment that introduced it.
      const leafField = readLeafField(snap.analysis, tracked.path);
      if (!leafField) continue;

      const valueKey = stableValueKey(leafField);
      if (valueKey === lastValueKey) continue; // unchanged from prior snapshot

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
      // unused leafSnap retained as documentation
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

  // Build per-amendment metadata: which fields changed at this version + category + annotation.
  const versionsMeta: AmendmentVersionMetaRecord[] = [
    {
      version: 0,
      sourceDocId: 'original',
      sourceLabel: 'Original Lease',
      effectiveDate: originalEffectiveDate,
      changedFieldPaths: [],
      category: 'other',
    },
  ];

  for (let i = 0; i < amendments.length; i++) {
    const amd = amendments[i];
    const version = i + 1;

    const changedPaths: string[] = [];
    const changedTracked: TrackedField[] = [];
    for (const tracked of TRACKED_FIELDS) {
      const hist = fieldHistories[tracked.path];
      if (!hist) continue;
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
    });
  }

  return {
    leaseId,
    versions: versionsMeta,
    fieldHistories,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Extract the leaf field at a dot path; return null if unreachable. */
function readLeafField(
  tree: Record<string, unknown>,
  path: string,
): { displayValue: string; rawValue: unknown; citation: CitationRef } | null {
  const parts = path.split('.');
  let node: unknown = tree;
  for (const p of parts) {
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return null;
    node = (node as Record<string, unknown>)[p];
    if (node === undefined) return null;
  }
  if (node === null || node === undefined) return null;

  // LeaseField shape: { value, citation, amendments, pageReference }
  // SecurityDepositStructured shape: { amount, conditions, citation, pageReference, amendments }
  if (typeof node === 'object' && !Array.isArray(node)) {
    const obj = node as Record<string, unknown>;
    const displayValue =
      typeof obj.value === 'string'
        ? obj.value
        : typeof obj.amount === 'string'
          ? obj.amount
          : '';
    if (displayValue === '' || displayValue == null) {
      // Field is present but empty — skip (treat as "no record").
      return null;
    }
    const pageRef = obj.pageReference as
      | { page?: number; section?: string; highlightText?: string }
      | undefined;
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

/** Fallback: parse "p. 12" or "page 12" or "12" out of a citation string. */
function parsePageFromCitation(s: string): number {
  const m = s.match(/(?:p\.?|page)?\s*(\d{1,4})/i);
  return m ? parseInt(m[1], 10) : 1;
}

/** Stable key for value-equality across snapshots. */
function stableValueKey(leaf: { displayValue: string; rawValue: unknown }): string {
  const raw =
    typeof leaf.rawValue === 'string' || typeof leaf.rawValue === 'number'
      ? String(leaf.rawValue)
      : JSON.stringify(leaf.rawValue ?? null);
  return `${leaf.displayValue}::${raw}`;
}

/** Pick the dominant category for a version based on which fields changed. */
function dominantCategory(changed: TrackedField[]): AmendmentCategory {
  if (changed.length === 0) return 'other';
  const counts = new Map<AmendmentCategory, number>();
  for (const f of changed) {
    counts.set(f.category, (counts.get(f.category) ?? 0) + 1);
  }
  // Priority order when tied: party > term > financial > operational > other.
  const priority: AmendmentCategory[] = ['party', 'term', 'financial', 'operational', 'other'];
  let best: AmendmentCategory = 'other';
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

/** Build a compact one-line "+$10k rent · +2yr term" annotation. */
function buildAnnotation(
  histories: Record<string, FieldHistoryRecord>,
  changed: TrackedField[],
  atVersion: number,
): string | undefined {
  if (changed.length === 0) return undefined;
  const parts: string[] = [];
  for (const f of changed.slice(0, 2)) {
    const hist = histories[f.path];
    if (!hist) continue;
    const idx = hist.versions.findIndex((v) => v.version === atVersion);
    if (idx <= 0) {
      parts.push(`new ${f.label.toLowerCase()}`);
      continue;
    }
    const prev = hist.versions[idx - 1];
    const cur = hist.versions[idx];
    parts.push(compactDelta(f.label, prev.displayValue, cur.displayValue));
  }
  if (changed.length > 2) parts.push(`+${changed.length - 2} more`);
  return parts.join(' · ');
}

function compactDelta(label: string, prev: string, cur: string): string {
  // For numeric-ish values, try to produce "+$10k" style; otherwise show "label: new".
  const prevNum = extractNumber(prev);
  const curNum = extractNumber(cur);
  if (prevNum !== null && curNum !== null && prevNum !== curNum) {
    const sign = curNum > prevNum ? '+' : '−';
    const delta = Math.abs(curNum - prevNum);
    return `${sign}${formatCompactNumber(delta)} ${label.toLowerCase()}`;
  }
  return `${label}: ${truncate(cur, 18)}`;
}

function extractNumber(s: string): number | null {
  const m = s.replace(/[,$ ]/g, '').match(/-?\d+(\.\d+)?/);
  return m ? parseFloat(m[0]) : null;
}

function formatCompactNumber(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + '…';
}
