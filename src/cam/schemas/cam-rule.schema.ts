import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type CamRuleDocumentModel = HydratedDocument<CamRule> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Portfolio-scoped reusable CAM rule template.
 *
 * Snapshot-on-attach semantics: when a unit attaches a rule, the rule's
 * params are copied into `unit.cam_allocation`. The unit becomes the source
 * of truth at compute time — editing this rule later does NOT retroactively
 * mutate attached units. This keeps historical replays stable.
 *
 * `rule_code` is the human-friendly identifier the lease clause cites
 * (e.g. "CAM-014", "Section 5.3"). It's unique within a portfolio so the
 * unit form can autocomplete by code.
 */
@Schema({ collection: 'cam_rules', timestamps: true })
export class CamRule {
  /** Public id, e.g. rul_<hex> */
  @Prop({ required: true, index: { unique: true, sparse: true } })
  ruleId: string;

  @Prop({ required: true, index: true })
  portfolio_id: string;

  /** Human-facing identifier the lease cites, e.g. "CAM-014". */
  @Prop({ required: true })
  rule_code: string;

  /** Display label, e.g. "Base Year Stop". */
  @Prop({ required: true })
  rule_name: string;

  /** Free-text description of the rule's intent. */
  @Prop({ default: '' })
  description: string;

  /**
   * Engine params copied to attached units. Same units/semantics as
   * `Unit.cam_allocation`:
   *   base_amount   — YTD ceiling absorbed by tenant
   *   base_year     — display only; the year the ceiling was set against
   *   share_pct     — stored as decimal (0.0482 = 4.82%)
   *   admin_fee_pct — decimal | null
   *   exclusions    — category names that produce $0 invoices for the
   *                   attached unit but still update threshold
   */
  @Prop({ type: Number, default: 0 })
  base_amount: number;

  @Prop({ type: Number, default: () => new Date().getUTCFullYear() })
  base_year: number;

  @Prop({ type: Number, default: 0 })
  share_pct: number;

  @Prop({ type: Number, default: null })
  admin_fee_pct: number | null;

  @Prop({ type: [String], default: [] })
  exclusions: string[];

  @Prop({ type: String, default: null })
  created_by: string | null;
}

export const CamRuleSchema = SchemaFactory.createForClass(CamRule);

// Case-insensitive rule_code uniqueness within a portfolio so the form
// can autocomplete by code without ambiguity.
CamRuleSchema.index(
  { portfolio_id: 1, rule_code: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
