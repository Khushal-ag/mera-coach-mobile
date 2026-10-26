import { FRIENDLY_NOT_FOUND, toUserMessage } from '../api/clientErrors';
import { getPaymentPageUrl } from '../config/appConfig';
import { VALIDITY_WARN_DAYS } from './validity';

/** Shown when the premium check fails, including a generic not-found response. */
export const SUBSCRIPTION_STATUS_UNAVAILABLE =
  'We could not load your subscription status. Please try again.';

export type AddClientAccess = 'wizard' | 'paywall';

/**
 * Unpaid coaches hit the paywall only when the subscription hard limit is on.
 * A failed status check is handled by the caller and is not an access result.
 */
export function resolveAddClientAccess(
  subscriptionRequired: boolean,
  isPaid: boolean,
): AddClientAccess {
  if (!subscriptionRequired) return 'wizard';
  return isPaid ? 'wizard' : 'paywall';
}

export function subscriptionCheckErrorMessage(error: unknown): string {
  const mapped = toUserMessage(error, SUBSCRIPTION_STATUS_UNAVAILABLE);
  if (!mapped.trim() || mapped === FRIENDLY_NOT_FOUND) return SUBSCRIPTION_STATUS_UNAVAILABLE;
  return mapped;
}

/** Shown when subscription plans cannot be loaded, including a generic not-found response. */
export const PREMIUM_PLANS_UNAVAILABLE = 'We could not load subscription plans. Please try again.';

export function premiumPlansErrorMessage(error: unknown): string {
  const mapped = toUserMessage(error, PREMIUM_PLANS_UNAVAILABLE);
  if (!mapped.trim() || mapped === FRIENDLY_NOT_FOUND) return PREMIUM_PLANS_UNAVAILABLE;
  return mapped;
}

/** Pull-to-refresh already mapped the error. Swap only the generic not-found sentence. */
export function premiumPlansRefreshMessage(message: string | null): string | null {
  if (!message || message === FRIENDLY_NOT_FOUND) {
    return message ? PREMIUM_PLANS_UNAVAILABLE : null;
  }
  return message;
}

export interface PremiumPlan {
  /** Set for catalog rows (MT_CoachPlan.Plan_Cd). The single app plan omits it. */
  planId?: number;
  planName: string;
  durationMonths: number;
  /** Minimum months the coach must pay for, when the API sends it separately. */
  minimumMonths?: number;
  basePrice: number;
  discountPercent: number;
  finalPrice: number;
  isDefault?: boolean;
  /** Benefit lines from the API. The screen uses its own list when this is empty. */
  features?: string[];
}

export interface SuggestedPromo {
  code: string;
  description: string;
  discountType: string;
  discountValue: number;
}

export type SubscriptionStatus = 'none' | 'active' | 'expired';

/** The signed-in coach's own period, from GET Coach/premium. */
export interface CoachSubscription {
  status: SubscriptionStatus;
  planName: string;
  /** Rupees charged on the paid order. Zero when the coach has no paid row. */
  amount: number;
  durationMonths: number;
  startedOn: string | null;
  /** When access ends (the coach's ValidUpto), including any plan already lined up. */
  expiresOn: string | null;
  // The fields below come from newer APIs and are absent from older ones.
  planId?: number | null;
  /** When the plan running now ends. Earlier than expiresOn when another plan follows it. */
  periodEndsOn?: string | null;
  /** A plan already paid for that starts when the current one ends. */
  next?: NextSubscription | null;
  /** From this date the current plan can be renewed and any plan bought. */
  renewalOpensOn?: string | null;
  /** A plan the API will not sell again yet. */
  blockedPlanId?: number | null;
  /** A plan is already lined up, so nothing more can be bought until renewalOpensOn. */
  hasUpcomingPlan?: boolean;
  /** The plan lined up next can be cancelled and refunded in the app. */
  canCancelUpcomingPlan?: boolean;
}

export interface NextSubscription {
  planName: string;
  amount: number;
  durationMonths: number;
  startsOn: string | null;
  endsOn: string | null;
}

/** One paid order from GET Coach/premium-history. */
export interface PaymentHistoryItem {
  orderId: string;
  planName: string;
  durationMonths: number;
  amount: number;
  promoCode: string | null;
  /** When the order was created; the payment follows within minutes. */
  orderedOn: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  /** Masked, so the coach can quote it to support. */
  paymentReference: string | null;
  /** Paid, or a refund that is still settling or finished. */
  status: PaymentStatus;
}

export type PaymentStatus = 'paid' | 'refunding' | 'refunded';

export interface PremiumOffer {
  isPaid: boolean;
  plan: PremiumPlan | null;
  promo: SuggestedPromo | null;
  subscription: CoachSubscription;
}

/** Every active plan plus the one suggested promo, from Coach/premium-plans. */
export interface PremiumCatalog {
  plans: PremiumPlan[];
  promo: SuggestedPromo | null;
  /** Shared benefit lines when a plan row does not include its own. */
  features: string[];
}

function readNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  return Number.isFinite(n) ? n : 0;
}

function readText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readFlag(value: unknown): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value === 1;
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    return s === '1' || s === 'true';
  }
  return false;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
}

function mapFeatureList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const lines: string[] = [];
  for (const item of value) {
    if (typeof item === 'string') {
      const text = item.trim();
      if (text) lines.push(text);
      continue;
    }
    const raw = asRecord(item);
    if (!raw) continue;
    const text = readText(
      raw.text ??
        raw.Text ??
        raw.name ??
        raw.Name ??
        raw.label ??
        raw.Label ??
        raw.feature ??
        raw.Feature,
    );
    if (text) lines.push(text);
  }
  return lines;
}

/**
 * Original term price when BasePrice was omitted.
 * Uses the stored discount percent only. Does not invent a percent.
 */
function deriveBasePrice(finalPrice: number, discountPercent: number): number {
  if (finalPrice <= 0 || discountPercent <= 0 || discountPercent >= 100) return 0;
  return finalPrice / (1 - discountPercent / 100);
}

function mapPlan(value: unknown): PremiumPlan | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const planId = readNumber(raw.planId ?? raw.PlanId);
  const planName = readText(raw.planName ?? raw.PlanName);
  const durationMonths = readNumber(raw.durationMonths ?? raw.DurationMonths);
  const minimumMonths = readNumber(
    raw.minimumMonths ??
      raw.MinimumMonths ??
      raw.minMonths ??
      raw.MinMonths ??
      raw.minimumSubscriptionMonths ??
      raw.MinimumSubscriptionMonths,
  );
  const listedBase = readNumber(raw.basePrice ?? raw.BasePrice);
  const discountPercent = readNumber(raw.discountPercent ?? raw.DiscountPercent);
  const finalPrice = readNumber(raw.finalPrice ?? raw.FinalPrice);
  const basePrice = listedBase > 0 ? listedBase : deriveBasePrice(finalPrice, discountPercent);
  const features = mapFeatureList(raw.features ?? raw.Features);
  const isDefault = readFlag(
    raw.isDefault ??
      raw.IsDefault ??
      raw.default ??
      raw.Default ??
      raw.isDefaultPlan ??
      raw.IsDefaultPlan,
  );
  if (!planName && durationMonths <= 0 && basePrice <= 0 && finalPrice <= 0) return null;
  return {
    ...(planId > 0 ? { planId } : {}),
    planName: planName || 'Premium',
    durationMonths: durationMonths > 0 ? durationMonths : 1,
    ...(minimumMonths > 0 ? { minimumMonths } : {}),
    basePrice,
    discountPercent,
    finalPrice,
    ...(isDefault ? { isDefault: true } : {}),
    ...(features.length > 0 ? { features } : {}),
  };
}

function mapPromo(value: unknown): SuggestedPromo | null {
  const raw = asRecord(value);
  if (!raw) return null;
  const code = readText(raw.code ?? raw.Code);
  if (!code) return null;
  return {
    code,
    description: readText(raw.description ?? raw.Description),
    discountType: readText(raw.discountType ?? raw.DiscountType),
    discountValue: readNumber(raw.discountValue ?? raw.DiscountValue),
  };
}

const SUBSCRIPTION_DATE = /^(\d{4})-(\d{2})-(\d{2})/;
const SUBSCRIPTION_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

function emptySubscription(status: SubscriptionStatus): CoachSubscription {
  return {
    status,
    planName: '',
    amount: 0,
    durationMonths: 0,
    startedOn: null,
    expiresOn: null,
  };
}

function readSubscriptionStatus(value: unknown, paidFlag: boolean): SubscriptionStatus {
  const text = readText(value).toLowerCase();
  if (text === 'active' || text === 'expired' || text === 'none') return text;
  return paidFlag ? 'active' : 'none';
}

function readDateText(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');
    return `${value.getFullYear()}-${month}-${day}`;
  }
  const text = readText(value);
  if (!text || !parseSubscriptionDate(text)) return null;
  return text;
}

/** Calendar date from an API datetime. Uses the date in the string, not the device timezone. */
function parseSubscriptionDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = SUBSCRIPTION_DATE.exec(value.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month || date.getDate() !== day) {
    return null;
  }
  return date;
}

/** "11 Oct 2026". Null when the value is missing or not a date. */
export function formatSubscriptionDate(value: string | null | undefined): string | null {
  const date = parseSubscriptionDate(value);
  if (!date) return null;
  return `${date.getDate()} ${SUBSCRIPTION_MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Billing period shown on the profile. Named terms match the plan catalog. */
export function subscriptionPeriodLabel(months: number): string {
  const n = Math.round(months);
  if (n === 1) return 'Monthly';
  if (n === 3) return 'Quarterly';
  if (n === 6) return 'Half yearly';
  if (n === 12) return 'Yearly';
  if (n > 1) return subscriptionMonthLabel(n);
  return '';
}

export function subscriptionDaysLeft(
  expiresOn: string | null | undefined,
  today = new Date(),
): number | null {
  const end = parseSubscriptionDate(expiresOn);
  if (!end) return null;
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

/** Profile caption for a future or same-day end. Past dates stay on the expired state. */
export function subscriptionDaysLeftLabel(days: number | null): string | null {
  if (days == null || days < 0) return null;
  if (days === 0) return 'Ends today';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/** Fingerprint of a subscription period, used to notice that a payment has changed it. */
export function subscriptionFingerprint(
  subscription: CoachSubscription | null | undefined,
): string {
  if (!subscription) return 'none';
  return [
    subscription.status,
    subscription.planName,
    subscription.startedOn ?? '',
    subscription.expiresOn ?? '',
  ].join('|');
}

/** Share (0 to 1) of the paid period already used. Null when a date is missing or the period has no length. */
export function subscriptionElapsedFraction(
  startedOn: string | null | undefined,
  expiresOn: string | null | undefined,
  today = new Date(),
): number | null {
  const start = parseSubscriptionDate(startedOn);
  const end = parseSubscriptionDate(expiresOn);
  if (!start || !end || end.getTime() <= start.getTime()) return null;
  const now = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const fraction = (now - start.getTime()) / (end.getTime() - start.getTime());
  return Math.min(1, Math.max(0, fraction));
}

/** Days before the end when an active coach may renew the plan they already have (the same window as the validity warning). */
const RENEWAL_WINDOW_DAYS = VALIDITY_WARN_DAYS;

/** True once an active plan may be renewed: the API's renewal date when it sends one, otherwise the last 15 days. */
export function isRenewalWindow(
  subscription: CoachSubscription | null,
  today = new Date(),
): boolean {
  if (!subscription || subscription.status !== 'active') return false;
  const opens = parseSubscriptionDate(subscription.renewalOpensOn);
  if (opens) {
    return (
      new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() >= opens.getTime()
    );
  }
  const days = subscriptionDaysLeft(subscription.expiresOn, today);
  return days != null && days <= RENEWAL_WINDOW_DAYS;
}

/**
 * The plans an active coach may buy right now. The API refuses the rest, so listing them would only lead to an error:
 * nothing while a plan is already lined up, otherwise everything except the plan it will not sell again yet.
 * Older APIs send neither field, so the plan in use is hidden until the renewal window.
 */
export function purchasablePlans(
  plans: PremiumPlan[],
  subscription: CoachSubscription | null,
  today = new Date(),
): PremiumPlan[] {
  if (!subscription || subscription.status !== 'active') return plans;
  if (subscription.hasUpcomingPlan) return [];
  if (subscription.blockedPlanId != null) {
    return plans.filter(plan => plan.planId !== subscription.blockedPlanId);
  }
  if (isRenewalWindow(subscription, today)) return plans;
  return plans.filter(plan => !isCurrentPlan(plan, subscription));
}

/** True when this catalog plan is the one the coach is paying for right now. */
export function isCurrentPlan(plan: PremiumPlan, subscription: CoachSubscription | null): boolean {
  if (!subscription || subscription.status !== 'active') return false;
  if (plan.planId != null && subscription.planId != null)
    return plan.planId === subscription.planId;
  if (subscription.durationMonths > 0)
    return planMinimumMonths(plan) === subscription.durationMonths;
  const current = subscription.planName.trim().toLowerCase();
  return current !== '' && plan.planName.trim().toLowerCase() === current;
}

function mapCoachSubscription(value: unknown, paidFlag: boolean): CoachSubscription {
  const raw = asRecord(value);
  if (!raw) return emptySubscription(paidFlag ? 'active' : 'none');
  const amount = readNumber(raw.amount ?? raw.Amount);
  const durationMonths = readNumber(raw.durationMonths ?? raw.DurationMonths);
  return {
    status: readSubscriptionStatus(raw.status ?? raw.Status, paidFlag),
    planName: readText(raw.planName ?? raw.PlanName),
    amount: amount > 0 ? amount : 0,
    durationMonths: durationMonths > 0 ? Math.round(durationMonths) : 0,
    startedOn: readDateText(raw.startedOn ?? raw.StartedOn ?? raw.periodStart ?? raw.PeriodStart),
    expiresOn: readDateText(raw.expiresOn ?? raw.ExpiresOn ?? raw.periodEnd ?? raw.PeriodEnd),
    planId: readOptionalId(raw.planId ?? raw.PlanId),
    periodEndsOn: readDateText(raw.periodEndsOn ?? raw.PeriodEndsOn),
    next: mapNextSubscription(raw),
    renewalOpensOn: readDateText(raw.renewalOpensOn ?? raw.RenewalOpensOn),
    blockedPlanId: readOptionalId(raw.blockedPlanId ?? raw.BlockedPlanId),
    hasUpcomingPlan: readFlag(raw.hasUpcomingPlan ?? raw.HasUpcomingPlan),
    canCancelUpcomingPlan: readFlag(raw.canCancelUpcomingPlan ?? raw.CanCancelUpcomingPlan),
  };
}

function readOptionalId(value: unknown): number | null {
  const id = readNumber(value);
  return id > 0 ? Math.round(id) : null;
}

function mapNextSubscription(raw: Record<string, unknown>): NextSubscription | null {
  const planName = readText(raw.nextPlanName ?? raw.NextPlanName);
  const startsOn = readDateText(raw.nextStartsOn ?? raw.NextStartsOn);
  if (!planName && !startsOn) return null;
  const months = readNumber(raw.nextDurationMonths ?? raw.NextDurationMonths);
  const amount = readNumber(raw.nextAmount ?? raw.NextAmount);
  return {
    planName,
    amount: amount > 0 ? amount : 0,
    durationMonths: months > 0 ? Math.round(months) : 0,
    startsOn,
    endsOn: readDateText(raw.nextEndsOn ?? raw.NextEndsOn),
  };
}

function readPaymentStatus(value: unknown): PaymentStatus {
  const text = readText(value).toLowerCase();
  return text === 'refunding' || text === 'refunded' ? text : 'paid';
}

/** Accepts the unwrapped responseObj of GET Coach/premium-history. */
export function mapPaymentHistory(raw: unknown): PaymentHistoryItem[] {
  const bag = asRecord(raw);
  const list = bag?.payments ?? bag?.Payments;
  if (!Array.isArray(list)) return [];
  return list.flatMap(entry => {
    const row = asRecord(entry);
    if (!row) return [];
    const orderId = readText(row.orderId ?? row.OrderId);
    if (!orderId) return [];
    const amount = readNumber(row.amount ?? row.Amount);
    const months = readNumber(row.durationMonths ?? row.DurationMonths);
    return [
      {
        orderId,
        planName: readText(row.planName ?? row.PlanName),
        durationMonths: months > 0 ? Math.round(months) : 0,
        amount: amount > 0 ? amount : 0,
        promoCode: readText(row.promoCode ?? row.PromoCode) || null,
        orderedOn: readDateText(row.orderedOn ?? row.OrderedOn),
        periodStart: readDateText(row.periodStart ?? row.PeriodStart),
        periodEnd: readDateText(row.periodEnd ?? row.PeriodEnd),
        paymentReference: readText(row.paymentReference ?? row.PaymentReference) || null,
        status: readPaymentStatus(row.status ?? row.Status),
      },
    ];
  });
}

/** Accepts the unwrapped responseObj (camelCase or PascalCase). */
export function mapPremiumOffer(raw: unknown): PremiumOffer {
  const bag = asRecord(raw) ?? {};
  const paidFlag = readFlag(bag.isPaid ?? bag.IsPaid ?? bag.isPremium ?? bag.IsPremium);
  const subscriptionRaw = bag.subscription ?? bag.Subscription;
  const subscription = mapCoachSubscription(subscriptionRaw, paidFlag);
  // When the API sends a period, that status is the paid flag the add-client gate uses.
  const isPaid = asRecord(subscriptionRaw) ? subscription.status === 'active' : paidFlag;
  return {
    isPaid,
    plan: mapPlan(bag.plan ?? bag.Plan),
    promo: mapPromo(bag.promo ?? bag.Promo),
    subscription,
  };
}

/** Active plans, shortest duration first. */
export function mapPremiumCatalog(raw: unknown): PremiumCatalog {
  const bag = asRecord(raw) ?? {};
  const list = bag.plans ?? bag.Plans;
  const plans = (Array.isArray(list) ? list : [])
    .map(mapPlan)
    .filter((plan): plan is PremiumPlan => plan != null)
    .sort((a, b) => a.durationMonths - b.durationMonths || (a.planId ?? 0) - (b.planId ?? 0));
  return {
    plans,
    promo: mapPromo(bag.promo ?? bag.Promo),
    features: mapFeatureList(bag.features ?? bag.Features),
  };
}

/** Plan shown before the coach picks. The API default wins; otherwise the shortest. */
export function defaultPremiumPlan(plans: PremiumPlan[]): PremiumPlan | null {
  if (plans.length === 0) return null;
  return plans.find(plan => plan.isDefault) ?? plans[0];
}

export function planMinimumMonths(plan: PremiumPlan): number {
  if (plan.minimumMonths != null && plan.minimumMonths > 0) return Math.round(plan.minimumMonths);
  return plan.durationMonths > 0 ? Math.round(plan.durationMonths) : 1;
}

/** Stable picker key. Catalog rows use Plan_Cd; a plan without an id falls back to its terms. */
export function planSelectionKey(plan: PremiumPlan): string {
  if (plan.planId != null && plan.planId > 0) return `id:${plan.planId}`;
  return `${plan.planName}:${plan.durationMonths}:${plan.finalPrice}`;
}

/** Undiscounted monthly rate (BasePrice / DurationMonths). Struck through when the plan is cheaper. */
export function planMonthlyRate(plan: PremiumPlan): number {
  const months = plan.durationMonths > 0 ? plan.durationMonths : 1;
  return plan.basePrice / months;
}

/** What the coach pays per month after the plan discount (FinalPrice / Duration_Months). */
export function planPayableMonthly(plan: PremiumPlan): number {
  const months = plan.durationMonths > 0 ? plan.durationMonths : 1;
  return plan.finalPrice / months;
}

/**
 * Rupees due for the minimum term.
 * When that term is the plan duration, this is FinalPrice (the customer price).
 */
export function planTermTotal(plan: PremiumPlan): number {
  const months = planMinimumMonths(plan);
  const duration = plan.durationMonths > 0 ? Math.round(plan.durationMonths) : 1;
  if (months === duration) return plan.finalPrice;
  return planPayableMonthly(plan) * months;
}

/**
 * Undiscounted rupees for the same term.
 * When that term is the plan duration, this is BasePrice (the struck-through total).
 */
export function planOriginalTermTotal(plan: PremiumPlan): number {
  const months = planMinimumMonths(plan);
  const duration = plan.durationMonths > 0 ? Math.round(plan.durationMonths) : 1;
  if (months === duration) return plan.basePrice;
  return planMonthlyRate(plan) * months;
}

export function subscriptionMonthLabel(months: number): string {
  const n = months > 0 ? Math.round(months) : 1;
  return n === 1 ? '1 month' : `${n} months`;
}

function groupIndianDigits(intPart: string): string {
  const negative = intPart.startsWith('-');
  const digits = negative ? intPart.slice(1) : intPart;
  if (digits.length <= 3) return intPart;
  const head = digits.slice(0, -3);
  const tail = digits.slice(-3);
  const groupedHead = head.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
  return `${negative ? '-' : ''}${groupedHead},${tail}`;
}

/** Rupee amount. Whole rupees omit paise; anything else shows two decimals. */
export function formatInr(amount: number): string {
  const rounded = Math.round(amount * 100) / 100;
  const negative = rounded < 0;
  const abs = Math.abs(rounded);
  const [whole, frac] = abs.toFixed(2).split('.');
  const grouped = groupIndianDigits(whole);
  const showFrac = frac !== '00';
  return `${negative ? '-' : ''}₹${grouped}${showFrac ? `.${frac}` : ''}`;
}

export function planShowsDiscount(plan: PremiumPlan): boolean {
  return plan.basePrice - plan.finalPrice > 0.009;
}

/**
 * Whole percent off, for a "20% off" label.
 * Uses the stored DiscountPercent when it matches the price gap.
 * Otherwise rounds the gap between BasePrice and FinalPrice.
 * Null when that would be 0% or the plan is not cheaper.
 */
export function planDiscountOffPercent(plan: PremiumPlan): number | null {
  if (!planShowsDiscount(plan) || plan.basePrice <= 0) return null;
  const computed = ((plan.basePrice - plan.finalPrice) / plan.basePrice) * 100;
  const fromPrices = Math.round(computed);
  if (fromPrices <= 0) return null;
  if (plan.discountPercent > 0 && Math.abs(plan.discountPercent - computed) < 0.5) {
    const fromApi = Math.round(plan.discountPercent);
    if (fromApi > 0) return fromApi;
  }
  return fromPrices;
}

/** Checkout URL with the signed-in coach attached so the website knows who is paying. */
export function buildCoachPaymentUrl(coach: {
  coachId?: string | number | null;
  coachCode?: string | null;
  /** Plan chosen in the app, so checkout opens on it. */
  planId?: number | null;
}): string {
  const base = getPaymentPageUrl();
  const params = new URLSearchParams();
  const id = coach.coachId == null ? '' : String(coach.coachId).trim();
  if (id && id !== '0') params.set('coachId', id);
  const code = coach.coachCode?.trim();
  if (code) params.set('coachCode', code);
  if (coach.planId != null && coach.planId > 0) params.set('planId', String(coach.planId));
  const qs = params.toString();
  if (!qs) return base;
  return base.includes('?') ? `${base}&${qs}` : `${base}?${qs}`;
}
