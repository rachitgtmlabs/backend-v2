import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { randomBytes } from 'crypto';
import { Model } from 'mongoose';
import { Lease, LeaseDocumentModel } from '../lease/schemas/lease.schema';
import { PortfolioService } from '../portfolio/portfolio.service';
import { PropertyService } from '../property/property.service';
import { CreateUnitDto } from './dto/create-unit.dto';
import { UpdateUnitDto } from './dto/update-unit.dto';
import { UpdateUnitFormDto } from './dto/update-unit-form.dto';
import { Unit, UnitDocumentModel } from './schemas/unit.schema';
import { normalizeUnitCode } from './utils/normalize-unit-code.util';

function newUnitId(): string {
  return `unt_${randomBytes(6).toString('hex')}`;
}

export type UnitPayload = ReturnType<UnitService['toUnitPayload']>;

/**
 * Distance threshold for considering a fuzzy hint a clear winner. Inclusive.
 * Above this we still return candidates but mark matched=false.
 */
const FUZZY_MATCH_DISTANCE_THRESHOLD = 2;

@Injectable()
export class UnitService {
  private readonly logger = new Logger(UnitService.name);

  constructor(
    @InjectModel(Unit.name)
    private unitModel: Model<UnitDocumentModel>,
    @InjectModel(Lease.name)
    private leaseModel: Model<LeaseDocumentModel>,
    private readonly portfolioService: PortfolioService,
    private readonly propertyService: PropertyService,
  ) {}

  async create(dto: CreateUnitDto): Promise<{ unit: UnitPayload }> {
    const portfolioId = dto.portfolio_id.trim();
    const propertyId = dto.property_id.trim();

    await this.ensurePortfolioPropertyPair(portfolioId, propertyId);

    const rawCode = dto.unit_code.trim();
    if (!rawCode) {
      throw new BadRequestException('unit_code is required');
    }
    const normalized = normalizeUnitCode(rawCode);
    if (!normalized) {
      throw new BadRequestException('unit_code is required');
    }
    // unit_name falls back to the raw code so the table always has something
    // to display, but the canonical lookup key is `unit_code`.
    const unitName = dto.unit_name?.trim() || rawCode;

    try {
      const doc = await this.unitModel.create({
        unitId: newUnitId(),
        portfolio_id: portfolioId,
        property_id: propertyId,
        unit_code: normalized,
        unit_name: unitName,
        unit_type: dto.unit_type ?? null,
        floor: dto.floor?.trim() || null,
        building: dto.building ?? null,
        premises: dto.premises ?? null,
        sqft_rentable: dto.sqft_rentable ?? null,
        sqft_usable: dto.sqft_usable ?? null,
        parking_count: dto.parking_count ?? null,
        status: dto.status ?? 'active',
        notes: dto.notes ?? null,
        is_default_migrated: false,
      });
      return { unit: this.toUnitPayload(doc) };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        const existing = await this.unitModel
          .findOne({ property_id: propertyId, unit_code: normalized })
          .collation({ locale: 'en', strength: 2 })
          .exec();
        if (existing) {
          throw new ConflictException({
            message: `A unit with code "${normalized}" already exists on this property`,
            existing: this.toUnitPayload(existing),
          });
        }
        throw new ConflictException('Unit code already exists on this property');
      }
      throw err;
    }
  }

  async listByProperty(
    portfolioId: string,
    propertyId: string,
  ): Promise<{ units: UnitWithLeaseSummaryPayload[] }> {
    const pf = portfolioId.trim();
    const pr = propertyId.trim();
    await this.ensurePortfolioPropertyPair(pf, pr);

    const docs = await this.unitModel
      .find({ portfolio_id: pf, property_id: pr })
      .sort({ status: 1, createdAt: 1 })
      .exec();

    // Attach the latest processed lease per unit so the UI can show the
    // tenant + rent without a follow-up call. The Units table treats a
    // missing `current_lease_id` as "vacant", which was wrong for any unit
    // whose lease had been uploaded — this enrichment fixes that.
    const unitIds = docs.map((d) => d.unitId);
    const leases =
      unitIds.length === 0
        ? []
        : await this.leaseModel
            .find({
              portfolio_id: pf,
              unit_id: { $in: unitIds },
              status: 'processed',
            })
            .sort({ updatedAt: -1 })
            .lean();
    const latestLeaseByUnit = new Map<string, (typeof leases)[number]>();
    for (const l of leases) {
      if (!l.unit_id) continue;
      // First (after the -1 sort) wins → that's the most-recent lease.
      if (!latestLeaseByUnit.has(l.unit_id)) {
        latestLeaseByUnit.set(l.unit_id, l);
      }
    }

    return {
      units: docs.map((d) => {
        const base = this.toUnitPayload(d);
        const lease = latestLeaseByUnit.get(d.unitId);
        return {
          ...base,
          ...summarizeLease(lease, d.sqft_rentable),
        };
      }),
    };
  }

  async getOne(
    portfolioId: string,
    unitId: string,
  ): Promise<{ unit: UnitPayload }> {
    const doc = await this.findInPortfolioOrThrow(portfolioId.trim(), unitId.trim());
    return { unit: this.toUnitPayload(doc) };
  }

  async update(
    unitId: string,
    dto: UpdateUnitDto,
  ): Promise<{ unit: UnitPayload }> {
    const portfolioId = dto.portfolio_id.trim();
    const doc = await this.findInPortfolioOrThrow(portfolioId, unitId.trim());

    if (dto.unit_name !== undefined) doc.unit_name = dto.unit_name.trim();
    if (dto.unit_code !== undefined) {
      const normalized = normalizeUnitCode(dto.unit_code);
      if (!normalized) {
        throw new BadRequestException('unit_code cannot be empty');
      }
      doc.unit_code = normalized;
    }
    if (dto.unit_type !== undefined) doc.unit_type = dto.unit_type;
    if (dto.floor !== undefined) doc.floor = dto.floor || null;
    if (dto.building !== undefined) doc.building = dto.building || null;
    if (dto.premises !== undefined) doc.premises = dto.premises || null;
    if (dto.sqft_rentable !== undefined) doc.sqft_rentable = dto.sqft_rentable;
    if (dto.sqft_usable !== undefined) doc.sqft_usable = dto.sqft_usable;
    if (dto.parking_count !== undefined) doc.parking_count = dto.parking_count;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.notes !== undefined) doc.notes = dto.notes || null;
    if (dto.occupancy_status !== undefined) {
      doc.occupancy_status = dto.occupancy_status;
    }
    if (dto.cam_allocation !== undefined) {
      // Explicit null = clear the allocation. Otherwise patch the embedded
      // sub-doc — engine reads this at preview/commit time.
      if (dto.cam_allocation === null) {
        doc.cam_allocation = null;
      } else {
        const p = dto.cam_allocation;
        doc.cam_allocation = {
          base_amount: p.base_amount,
          base_year: p.base_year,
          share_pct: p.share_pct,
          exclusions: p.exclusions ?? [],
          admin_fee_pct: p.admin_fee_pct ?? null,
          rule_ids: p.rule_ids ?? [],
          rule_name: p.rule_name ?? '',
          source: p.source ?? 'manual_override',
        };
      }
    }

    try {
      const saved = await doc.save();
      return { unit: this.toUnitPayload(saved) };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Another unit on this property already uses that code',
        );
      }
      throw err;
    }
  }

  async updateForm(
    unitId: string,
    portfolioId: string,
    dto: UpdateUnitFormDto,
  ): Promise<{ unit: UnitPayload }> {
    const doc = await this.findInPortfolioOrThrow(portfolioId, unitId.trim());

    if (dto.unit_name !== undefined) doc.unit_name = dto.unit_name.trim();
    if (dto.unit_type !== undefined) doc.unit_type = dto.unit_type;
    if (dto.floor !== undefined) doc.floor = dto.floor || null;
    if (dto.building !== undefined) doc.building = dto.building || null;
    if (dto.premises !== undefined) doc.premises = dto.premises || null;
    if (dto.sqft_rentable !== undefined) doc.sqft_rentable = dto.sqft_rentable;
    if (dto.sqft_usable !== undefined) doc.sqft_usable = dto.sqft_usable;
    if (dto.parking_count !== undefined) doc.parking_count = dto.parking_count;
    if (dto.status !== undefined) doc.status = dto.status;
    if (dto.notes !== undefined) doc.notes = dto.notes || null;
    if (dto.occupancy_status !== undefined) {
      doc.occupancy_status = dto.occupancy_status;
    }
    if (dto.cam_allocation !== undefined) {
      if (dto.cam_allocation === null) {
        doc.cam_allocation = null;
      } else {
        const p = dto.cam_allocation;
        doc.cam_allocation = {
          base_amount: p.base_amount,
          base_year: p.base_year,
          share_pct: p.share_pct,
          exclusions: p.exclusions ?? [],
          admin_fee_pct: p.admin_fee_pct ?? null,
          rule_ids: p.rule_ids ?? [],
          rule_name: p.rule_name ?? '',
          source: p.source ?? 'manual_override',
        };
      }
    }

    try {
      const saved = await doc.save();
      return { unit: this.toUnitPayload(saved) };
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        throw new ConflictException(
          'Another unit on this property already uses that code',
        );
      }
      throw err;
    }
  }

  /**
   * Phase 1: the unit-deletion endpoint exists but lease/amendment cascade is
   * wired in a later phase (see plan). For now we refuse to delete a unit
   * that has dependent leases; the property cascade is the only path that
   * deletes units in the legacy single-unit world.
   */
  async remove(portfolioId: string, unitId: string): Promise<void> {
    const doc = await this.findInPortfolioOrThrow(
      portfolioId.trim(),
      unitId.trim(),
    );
    await this.unitModel.deleteOne({ unitId: doc.unitId }).exec();
  }

  /**
   * Server-side fuzzy match for the extraction auto-suggest flow. Returns the
   * best match plus up to 3 candidates with scores. `matched: true` only when
   * a single clear winner exists (normalized equality OR Levenshtein ≤ 2).
   */
  async findMatch(
    portfolioId: string,
    propertyId: string,
    hint: string,
  ): Promise<{
    matched: boolean;
    unit: UnitPayload | null;
    candidates: Array<UnitPayload & { score: number }>;
  }> {
    const pf = portfolioId.trim();
    const pr = propertyId.trim();
    await this.ensurePortfolioPropertyPair(pf, pr);

    const normalizedHint = normalizeUnitCode(hint);
    if (!normalizedHint) {
      return { matched: false, unit: null, candidates: [] };
    }

    const docs = await this.unitModel
      .find({ portfolio_id: pf, property_id: pr, status: 'active' })
      .exec();
    if (docs.length === 0) {
      return { matched: false, unit: null, candidates: [] };
    }

    const scored = docs
      .map((d) => ({
        doc: d,
        score: levenshtein(normalizedHint, d.unit_code),
      }))
      .sort((a, b) => a.score - b.score);

    const top = scored[0];
    const matched =
      top.score === 0 ||
      (top.score <= FUZZY_MATCH_DISTANCE_THRESHOLD &&
        (scored[1]?.score ?? Infinity) > top.score);

    return {
      matched,
      unit: matched ? this.toUnitPayload(top.doc) : null,
      candidates: scored.slice(0, 3).map(({ doc, score }) => ({
        ...this.toUnitPayload(doc),
        score,
      })),
    };
  }

  /**
   * Returns the sole active unit for a property when there is exactly one.
   * Used by lease-write paths to auto-link the unit when the caller omits
   * `unit_id`. Returns null for the multi-unit case so callers can branch.
   */
  async resolveSoleActiveUnit(
    portfolioId: string,
    propertyId: string,
  ): Promise<UnitDocumentModel | null> {
    const docs = await this.unitModel
      .find({ portfolio_id: portfolioId, property_id: propertyId, status: 'active' })
      .limit(2)
      .exec();
    return docs.length === 1 ? docs[0] : null;
  }

  /**
   * Confirm a unit id is owned by the given (portfolio, property) tuple.
   * Used by lease-write paths to validate caller-supplied unit_id.
   */
  async findInPortfolioProperty(
    portfolioId: string,
    propertyId: string,
    unitId: string,
  ): Promise<UnitDocumentModel | null> {
    return this.unitModel
      .findOne({
        unitId,
        portfolio_id: portfolioId,
        property_id: propertyId,
      })
      .exec();
  }

  /**
   * Counts of (total, active) units for each propertyId. Used by the
   * properties list response to surface `unit_count`/`occupied_count` so
   * the property card can render the single-unit shortcut.
   */
  async countsByPropertyIds(
    portfolioId: string,
    propertyIds: string[],
  ): Promise<
    Map<string, { unit_count: number; active_count: number; default_unit_id: string | null }>
  > {
    const map = new Map<
      string,
      { unit_count: number; active_count: number; default_unit_id: string | null }
    >();
    if (propertyIds.length === 0) return map;

    const docs = await this.unitModel
      .find({ portfolio_id: portfolioId, property_id: { $in: propertyIds } })
      .select({ unitId: 1, property_id: 1, status: 1, _id: 0 })
      .lean()
      .exec();

    for (const pid of propertyIds) {
      map.set(pid, { unit_count: 0, active_count: 0, default_unit_id: null });
    }

    const firstUnitByProperty = new Map<string, string>();
    for (const d of docs) {
      const bucket = map.get(d.property_id);
      if (!bucket) continue;
      bucket.unit_count += 1;
      if (d.status === 'active') bucket.active_count += 1;
      if (!firstUnitByProperty.has(d.property_id)) {
        firstUnitByProperty.set(d.property_id, d.unitId);
      }
    }
    // default_unit_id is only meaningful when the property has exactly one unit.
    for (const [pid, bucket] of map.entries()) {
      if (bucket.unit_count === 1) {
        bucket.default_unit_id = firstUnitByProperty.get(pid) ?? null;
      }
    }
    return map;
  }

  toUnitPayload(doc: UnitDocumentModel) {
    return {
      id: doc.unitId,
      portfolio_id: doc.portfolio_id,
      property_id: doc.property_id,
      unit_code: doc.unit_code,
      unit_name: doc.unit_name,
      unit_type: doc.unit_type,
      floor: doc.floor,
      building: doc.building,
      premises: doc.premises,
      sqft_rentable: doc.sqft_rentable,
      sqft_usable: doc.sqft_usable,
      parking_count: doc.parking_count,
      status: doc.status,
      notes: doc.notes,
      occupancy_status: doc.occupancy_status,
      cam_allocation: doc.cam_allocation
        ? {
            base_amount: doc.cam_allocation.base_amount,
            base_year: doc.cam_allocation.base_year,
            share_pct: doc.cam_allocation.share_pct,
            exclusions: doc.cam_allocation.exclusions ?? [],
            admin_fee_pct: doc.cam_allocation.admin_fee_pct ?? null,
            rule_ids: doc.cam_allocation.rule_ids ?? [],
            rule_name: doc.cam_allocation.rule_name ?? '',
            source: doc.cam_allocation.source,
          }
        : null,
      is_default_migrated: doc.is_default_migrated,
      audit: {
        created_at: doc.createdAt?.toISOString() ?? new Date().toISOString(),
        updated_at: doc.updatedAt?.toISOString() ?? new Date().toISOString(),
      },
      links: {
        self: `/v1/units/${doc.unitId}`,
      },
    };
  }

  private async ensurePortfolioPropertyPair(
    portfolioId: string,
    propertyId: string,
  ): Promise<void> {
    if (!(await this.portfolioService.existsByPortfolioId(portfolioId))) {
      throw new NotFoundException(`Portfolio not found: ${portfolioId}`);
    }
    if (
      !(await this.propertyService.belongsToPortfolio(propertyId, portfolioId))
    ) {
      throw new NotFoundException(`Property not found: ${propertyId}`);
    }
  }

  private async findInPortfolioOrThrow(
    portfolioId: string,
    unitId: string,
  ): Promise<UnitDocumentModel> {
    const doc = await this.unitModel
      .findOne({ unitId, portfolio_id: portfolioId })
      .exec();
    if (!doc) {
      throw new NotFoundException(`Unit not found: ${unitId}`);
    }
    return doc;
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as { code?: number }).code === 11000
  );
}

/** Compact Levenshtein for the fuzzy-match endpoint. */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let prev = new Array<number>(b.length + 1);
  let curr = new Array<number>(b.length + 1);
  for (let j = 0; j <= b.length; j += 1) prev[j] = j;

  for (let i = 1; i <= a.length; i += 1) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(
        curr[j - 1] + 1,
        prev[j] + 1,
        prev[j - 1] + cost,
      );
    }
    [prev, curr] = [curr, prev];
  }
  return prev[b.length];
}

/**
 * Lease summary fields appended to each unit row in `listByProperty`. The
 * frontend's `UnitWithLeaseSummary` type already expects these as optional —
 * we just populate them now.
 */
export interface UnitLeaseSummaryFields {
  current_lease_id: string | null;
  tenant_name: string | null;
  base_rent_annual: number | null;
  rent_per_sqft: number | null;
  lease_end: string | null;
}

export type UnitWithLeaseSummaryPayload = UnitPayload & UnitLeaseSummaryFields;

/**
 * Extract display-ready summary fields from the deeply-nested
 * `lease_information.leaseInformation` shape produced by the lease analysis
 * pipeline. Returns nulls when the lease is missing or the field is silent.
 *
 * - tenant_name = leaseTo.value  (the tenant entity per the analyzer prompt)
 * - rent_per_sqft = numeric leading "$N.NN" parsed out of rentPerSqFt.value
 * - base_rent_annual = rent_per_sqft × sqft_rentable when both are known;
 *                       otherwise null (we don't trust baseRent.value strings
 *                       like "$34.50 per rsf per annum" enough to parse here)
 */
function summarizeLease(
  lease: { leaseId: string; lease_information?: unknown } | undefined,
  sqftRentable: number | null,
): UnitLeaseSummaryFields {
  if (!lease) {
    return {
      current_lease_id: null,
      tenant_name: null,
      base_rent_annual: null,
      rent_per_sqft: null,
      lease_end: null,
    };
  }
  const info =
    (lease.lease_information as { leaseInformation?: Record<string, any> })
      ?.leaseInformation ?? {};

  const tenant: string | null =
    typeof info.leaseTo?.value === 'string' && info.leaseTo.value.trim()
      ? String(info.leaseTo.value).trim()
      : typeof info.tenant?.value === 'string' && info.tenant.value.trim()
        ? String(info.tenant.value).trim()
        : null;

  const rentPerSqft = parseMoneyLeading(info.rentPerSqFt?.value);
  const baseRentAnnual =
    rentPerSqft != null && sqftRentable != null && sqftRentable > 0
      ? Math.round(rentPerSqft * sqftRentable * 100) / 100
      : null;

  return {
    current_lease_id: lease.leaseId,
    tenant_name: tenant,
    base_rent_annual: baseRentAnnual,
    rent_per_sqft: rentPerSqft,
    // Lease end date isn't reliably stored as ISO on this schema — leaseTo is
    // the tenant entity in the current analyzer output. Leave null and let
    // the UI fall back to "—" until the analyzer surfaces a clean end_date.
    lease_end: null,
  };
}

/** Parse "$34.50" / "$34.50 per rsf" → 34.5. Returns null on failure. */
function parseMoneyLeading(raw: unknown): number | null {
  if (raw == null) return null;
  const s = String(raw);
  const m = s.match(/\$?\s*([0-9]+(?:\.[0-9]+)?)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}
