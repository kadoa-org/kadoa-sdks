/**
 * Data quality domain ACL.
 * Wraps the generated DataQualityApi rule types behind SDK-owned names.
 * Downstream code must import from this module instead of `generated/**`.
 */

import type { FieldValidationRules as GeneratedFieldValidationRules } from "../../generated";

// ========================================
// Attribution
// ========================================

/**
 * Actor type that last edited a rule. API clients send `user`.
 */
export type RuleEditor = "default" | "llm" | "agent" | "ops" | "user";

/**
 * Who last edited a specific rule and when. Every rule carries these fields.
 */
export interface RuleAttribution {
  editedBy: RuleEditor;
  /** Human-readable label for the editor, e.g. an email address. */
  editedByLabel?: string;
  /** ISO-8601 timestamp of the last edit. */
  editedAt: string;
}

// ========================================
// Leaf rules
// ========================================

/** Percentage of rows a presence or uniqueness rule requires. */
export type RuleTargetPercentage = 0 | 20 | 40 | 60 | 80 | 100;

/** Minimum percentage of rows that must have a value for the field. */
export interface PresenceRule extends RuleAttribution {
  target: RuleTargetPercentage;
}

/** Minimum percentage of values that must be unique in the column. */
export interface UniquenessRule extends RuleAttribution {
  target: RuleTargetPercentage;
}

/** Bound on the string length in characters. */
export interface StringLengthRule extends RuleAttribution {
  value: number;
}

/**
 * Bound on how many HTML elements the text contains. An opening or
 * self-closing tag counts as one element; closing tags do not count.
 */
export interface StringHtmlElementCountRule extends RuleAttribution {
  value: number;
}

export type StringCharsetPreset = "natural_language" | "alphanumeric" | "alpha";

export type StringPatternPreset =
  | "url"
  | "email"
  | "phone"
  | "date"
  | "datetime"
  | "time"
  | "uuid"
  | "slug";

export type StringListPreset =
  | "language2"
  | "country2"
  | "country3"
  | "currency3"
  | "month3"
  | "usState2";

/** Free text restricted to a character class. Length rules apply only with this kind. */
export interface StringFormatFreeTextRule extends RuleAttribution {
  kind: "FREE_TEXT";
  charset: { kind: "PRESET"; preset: StringCharsetPreset };
}

/** Values must match a named pattern preset or a custom regular expression. */
export interface StringFormatPatternRule extends RuleAttribution {
  kind: "FORMAT";
  source:
    | { kind: "PRESET"; preset: StringPatternPreset }
    | { kind: "CUSTOM"; pattern: string };
}

/** Values must come from a named list preset or a custom list of allowed values. */
export interface StringFormatListRule extends RuleAttribution {
  kind: "LIST";
  source:
    | { kind: "PRESET"; preset: StringListPreset }
    | { kind: "CUSTOM"; values: string[] };
}

export type StringFormatRule =
  | StringFormatFreeTextRule
  | StringFormatPatternRule
  | StringFormatListRule;

/** Inclusive bound on a numeric value. */
export interface NumberBoundRule extends RuleAttribution {
  value: number;
}

/** Maximum number of decimal places, 0 to 16. Use 0 for whole numbers. */
export interface NumberMaxDecimalPlacesRule extends RuleAttribution {
  value: number;
}

export type DateRelativePreset =
  | "TODAY"
  | "YESTERDAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "THIS_YEAR";

/** A fixed calendar date bound in `YYYY-MM-DD` format. */
export interface DateFixedBoundRule extends RuleAttribution {
  kind: "FIXED";
  date: string;
}

/**
 * A bound relative to the run date (UTC). As a minimum it resolves to the
 * first day of the period, as a maximum to the last day.
 */
export interface DateRelativeBoundRule extends RuleAttribution {
  kind: "RELATIVE";
  preset: DateRelativePreset;
}

export type DateBoundRule = DateFixedBoundRule | DateRelativeBoundRule;

/** Whether the object may contain properties that are not listed under `properties`. */
export interface ObjectAdditionalPropertiesRule extends RuleAttribution {
  allowed: boolean;
}

/** Bound on the number of items in the array. */
export interface ArrayItemCountRule extends RuleAttribution {
  value: number;
}

// ========================================
// Field rules
// ========================================

interface FieldRulesBase {
  presence?: PresenceRule;
  uniqueness?: UniquenessRule;
}

export interface StringFieldRules extends FieldRulesBase {
  kind: "STRING";
  minLength?: StringLengthRule;
  maxLength?: StringLengthRule;
  minHtmlElements?: StringHtmlElementCountRule;
  maxHtmlElements?: StringHtmlElementCountRule;
  format?: StringFormatRule;
}

export interface NumberFieldRules extends FieldRulesBase {
  kind: "NUMBER";
  minimum?: NumberBoundRule;
  maximum?: NumberBoundRule;
  maxDecimalPlaces?: NumberMaxDecimalPlacesRule;
}

/** Values are cast to a calendar date before the bounds apply. */
export interface DateFieldRules extends FieldRulesBase {
  kind: "DATE";
  minimum?: DateBoundRule;
  maximum?: DateBoundRule;
}

/** `properties` maps each sub-field name to its own rules, to any depth. */
export interface ObjectFieldRules extends FieldRulesBase {
  kind: "OBJECT";
  additionalProperties?: ObjectAdditionalPropertiesRule;
  properties: DataQualityRules;
}

/** `items` are the rules applied to every element of the array. */
export interface ArrayFieldRules extends FieldRulesBase {
  kind: "ARRAY";
  minItems?: ArrayItemCountRule;
  maxItems?: ArrayItemCountRule;
  items?: FieldRules;
}

/** Fallback for fields with no richer rule shape, e.g. booleans. */
export interface OtherFieldRules extends FieldRulesBase {
  kind: "OTHER";
}

/**
 * Rules for one schema field. `kind` selects the rule shape and casts the
 * field's values to that type before evaluation. A rule tree may nest at most
 * 4 levels deep and hold at most 200 evaluable rules.
 */
export type FieldRules =
  | StringFieldRules
  | NumberFieldRules
  | DateFieldRules
  | ObjectFieldRules
  | ArrayFieldRules
  | OtherFieldRules;

/** Per-field data quality rules of a workflow, keyed by schema field name. */
export type DataQualityRules = Record<string, FieldRules>;

// ========================================
// Spec drift check
// ========================================

type MutuallyAssignable<A, B> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : false
  : false;
type Assert<T extends true> = T;

/** Fails to compile when the SDK rule types drift from the published spec. */
type _RulesMatchSpec = Assert<
  MutuallyAssignable<FieldRules, GeneratedFieldValidationRules>
>;
