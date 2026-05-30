import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ExpenseCategoryDocumentModel = HydratedDocument<ExpenseCategory> & {
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Stories 4 & 5 — expense categories.
 *
 * System categories (is_system=true) are seeded once at the global level
 * (portfolio_id=null) — there are 15 of them and they're shared across all
 * portfolios. Custom categories (is_system=false) are scoped to a single
 * portfolio.
 *
 * Bills reference categories by `name` (not categoryId) so the OCR /
 * classification pipeline can stay string-based, matching the UX's
 * EXPENSE_CATS constant. The uniqueness index is on
 * (portfolio_id, name) — with portfolio_id=null for system rows — to
 * prevent duplicate names within a tenant's namespace.
 */
@Schema({ collection: 'expense_categories', timestamps: true })
export class ExpenseCategory {
  /** Public id, e.g. exc_<hex> */
  @Prop({ required: true, index: { unique: true, sparse: true } })
  categoryId: string;

  /**
   * null for system categories (visible to all portfolios). Set to a
   * portfolio_id for custom categories (visible only to that portfolio).
   */
  @Prop({ type: String, default: null, index: true })
  portfolio_id: string | null;

  @Prop({ required: true })
  name: string;

  @Prop({ default: '' })
  description: string;

  /**
   * Story 5 — defaults to true, used by the CAM engine as a quick reject
   * for categories the user has marked non-recoverable globally. Per-unit
   * exclusions on `unit.cam_allocation.exclusions` still apply on top of
   * this.
   */
  @Prop({ type: Boolean, default: true })
  recoverable: boolean;

  /** Read-only in UI; cannot be edited/deleted. */
  @Prop({ type: Boolean, default: false, index: true })
  is_system: boolean;

  @Prop({ type: String, default: null })
  notes: string | null;

  @Prop({ type: String, default: null })
  created_by: string | null;
}

export const ExpenseCategorySchema =
  SchemaFactory.createForClass(ExpenseCategory);

// Case-insensitive name uniqueness within a portfolio (null = system scope).
ExpenseCategorySchema.index(
  { portfolio_id: 1, name: 1 },
  { unique: true, collation: { locale: 'en', strength: 2 } },
);
ExpenseCategorySchema.index({ is_system: 1, name: 1 });
