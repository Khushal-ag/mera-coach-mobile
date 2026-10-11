import {
  buildCoachPaymentUrl,
  formatInr,
  formatSubscriptionDate,
  defaultPremiumPlan,
  mapPremiumCatalog,
  mapPremiumOffer,
  planDiscountOffPercent,
  planMonthlyRate,
  planMinimumMonths,
  planOriginalTermTotal,
  planPayableMonthly,
  planSelectionKey,
  planTermTotal,
  planShowsDiscount,
  PREMIUM_PLANS_UNAVAILABLE,
  premiumPlansErrorMessage,
  premiumPlansRefreshMessage,
  resolveAddClientAccess,
  SUBSCRIPTION_STATUS_UNAVAILABLE,
  subscriptionCheckErrorMessage,
  subscriptionDaysLeft,
  subscriptionDaysLeftLabel,
  subscriptionMonthLabel,
  subscriptionPeriodLabel,
} from '../../utils/premiumOffer';
import { ApiError, FRIENDLY_NETWORK, FRIENDLY_NOT_FOUND } from '../../api/clientErrors';
import { isSubscriptionRequired } from '../../config/appConfig';

const ORIGINAL_PAYMENT = process.env.EXPO_PUBLIC_PAYMENT_URL;
const ORIGINAL_WEB = process.env.EXPO_PUBLIC_WEB_BASE_URL;
const ORIGINAL_SUBSCRIPTION = process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED;

afterEach(() => {
  if (ORIGINAL_PAYMENT === undefined) delete process.env.EXPO_PUBLIC_PAYMENT_URL;
  else process.env.EXPO_PUBLIC_PAYMENT_URL = ORIGINAL_PAYMENT;
  if (ORIGINAL_WEB === undefined) delete process.env.EXPO_PUBLIC_WEB_BASE_URL;
  else process.env.EXPO_PUBLIC_WEB_BASE_URL = ORIGINAL_WEB;
  if (ORIGINAL_SUBSCRIPTION === undefined) delete process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED;
  else process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED = ORIGINAL_SUBSCRIPTION;
});

describe('mapPremiumOffer', () => {
  it('reads the app plan and hides a missing promo', () => {
    const offer = mapPremiumOffer({
      isPaid: false,
      plan: {
        planName: 'Monthly',
        durationMonths: 1,
        basePrice: 499,
        discountPercent: 0,
        finalPrice: 499,
      },
      promo: null,
    });
    expect(offer.isPaid).toBe(false);
    expect(offer.plan?.planName).toBe('Monthly');
    expect(offer.promo).toBeNull();
    expect(offer.subscription.status).toBe('none');
  });

  it('reads PascalCase and a suggested promo from the API', () => {
    const offer = mapPremiumOffer({
      IsPaid: 1,
      Plan: {
        PlanName: 'Quarterly',
        DurationMonths: 3,
        BasePrice: 1497,
        DiscountPercent: 20,
        FinalPrice: 1197.6,
      },
      Promo: {
        Code: 'SAVE10',
        Description: 'Early access',
        DiscountType: 'percent',
        DiscountValue: 10,
      },
    });
    expect(offer.isPaid).toBe(true);
    expect(offer.plan).toMatchObject({ planName: 'Quarterly', finalPrice: 1197.6 });
    expect(offer.promo?.code).toBe('SAVE10');
    expect(offer.subscription.status).toBe('active');
  });

  it('treats an active period as paid even when the old flag is false', () => {
    const offer = mapPremiumOffer({
      isPaid: false,
      subscription: {
        status: 'active',
        planName: 'Half yearly',
        amount: 2245.5,
        durationMonths: 6,
        startedOn: '2026-04-01T09:00:00',
        expiresOn: '2026-10-01T09:00:00',
      },
    });
    expect(offer.isPaid).toBe(true);
    expect(offer.subscription).toMatchObject({
      status: 'active',
      planName: 'Half yearly',
      amount: 2245.5,
      durationMonths: 6,
      startedOn: '2026-04-01T09:00:00',
      expiresOn: '2026-10-01T09:00:00',
    });
  });

  it('treats an ended period as unpaid and keeps the charged price', () => {
    const offer = mapPremiumOffer({
      IsPaid: true,
      Subscription: {
        Status: 'expired',
        PlanName: 'Quarterly',
        Amount: 1197.6,
        DurationMonths: 3,
        StartedOn: '2026-01-11T10:00:00',
        ExpiresOn: '2026-04-11T10:00:00',
      },
    });
    expect(offer.isPaid).toBe(false);
    expect(offer.subscription.status).toBe('expired');
    expect(offer.subscription.amount).toBe(1197.6);
    expect(formatSubscriptionDate(offer.subscription.startedOn)).toBe('11 Jan 2026');
    expect(formatSubscriptionDate(offer.subscription.expiresOn)).toBe('11 Apr 2026');
  });
});

describe('subscription profile dates', () => {
  const today = new Date(2026, 9, 11);

  it('names the billing period from the plan length', () => {
    expect(subscriptionPeriodLabel(1)).toBe('Monthly');
    expect(subscriptionPeriodLabel(3)).toBe('Quarterly');
    expect(subscriptionPeriodLabel(6)).toBe('Half yearly');
    expect(subscriptionPeriodLabel(12)).toBe('Yearly');
    expect(subscriptionPeriodLabel(2)).toBe('2 months');
    expect(subscriptionPeriodLabel(0)).toBe('');
  });

  it('formats the calendar date and counts days left', () => {
    expect(formatSubscriptionDate('2026-10-11T18:30:00')).toBe('11 Oct 2026');
    expect(formatSubscriptionDate('not-a-date')).toBeNull();
    expect(formatSubscriptionDate(null)).toBeNull();
    expect(subscriptionDaysLeft('2026-10-21T08:00:00', today)).toBe(10);
    expect(subscriptionDaysLeft('2026-10-11T23:00:00', today)).toBe(0);
    expect(subscriptionDaysLeft('2026-10-01T23:00:00', today)).toBe(-10);
    expect(subscriptionDaysLeft(null, today)).toBeNull();
    expect(subscriptionDaysLeftLabel(10)).toBe('10 days left');
    expect(subscriptionDaysLeftLabel(1)).toBe('1 day left');
    expect(subscriptionDaysLeftLabel(0)).toBe('Ends today');
    expect(subscriptionDaysLeftLabel(-1)).toBeNull();
    expect(subscriptionDaysLeftLabel(null)).toBeNull();
  });
});

describe('mapPremiumCatalog', () => {
  it('lists every active plan, shortest first, and keeps the suggested promo', () => {
    const catalog = mapPremiumCatalog({
      Plans: [
        {
          PlanId: 4,
          PlanName: 'Yearly',
          DurationMonths: 12,
          BasePrice: 5988,
          DiscountPercent: 30,
          FinalPrice: 4191.6,
        },
        {
          PlanId: 2,
          PlanName: 'Quarterly',
          DurationMonths: 3,
          BasePrice: 1497,
          DiscountPercent: 20,
          FinalPrice: 1197.6,
        },
        {
          PlanId: 1,
          PlanName: 'Monthly',
          DurationMonths: 1,
          BasePrice: 499,
          DiscountPercent: 0,
          FinalPrice: 499,
        },
        {
          PlanId: 3,
          PlanName: 'Half yearly',
          DurationMonths: 6,
          BasePrice: 2994,
          DiscountPercent: 25,
          FinalPrice: 2245.5,
        },
      ],
      Promo: {
        Code: 'MERACOACH20',
        Description:
          'Use promo code MERACOACH20 to get early access discount!\nLimited period offer.',
        DiscountType: 'percent',
        DiscountValue: 20,
      },
    });
    expect(catalog.plans.map(plan => plan.planName)).toEqual([
      'Monthly',
      'Quarterly',
      'Half yearly',
      'Yearly',
    ]);
    expect(catalog.plans.map(plan => plan.planId)).toEqual([1, 2, 3, 4]);
    expect(catalog.promo?.code).toBe('MERACOACH20');
    expect(formatInr(planPayableMonthly(catalog.plans[1]))).toBe('₹399.20');
    expect(formatInr(planPayableMonthly(catalog.plans[2]))).toBe('₹374.25');
    expect(planSelectionKey(catalog.plans[2])).toBe('id:3');
  });

  it('selects the API default, otherwise the shortest plan', () => {
    const marked = mapPremiumCatalog({
      plans: [
        {
          planName: 'Yearly',
          durationMonths: 12,
          basePrice: 1200,
          discountPercent: 0,
          finalPrice: 1200,
        },
        {
          planName: 'Quarterly',
          durationMonths: 3,
          basePrice: 1497,
          discountPercent: 0,
          finalPrice: 1497,
          IsDefault: true,
          MinimumMonths: 3,
          Features: ['Unlimited client management'],
        },
      ],
    });
    expect(defaultPremiumPlan(marked.plans)?.planName).toBe('Quarterly');
    expect(planMinimumMonths(marked.plans.find(plan => plan.planName === 'Quarterly')!)).toBe(3);
    expect(marked.plans.find(plan => plan.planName === 'Quarterly')?.features).toEqual([
      'Unlimited client management',
    ]);

    const unmarked = mapPremiumCatalog({
      plans: [
        {
          planName: 'Yearly',
          durationMonths: 12,
          basePrice: 1,
          discountPercent: 0,
          finalPrice: 1,
        },
        {
          planName: 'Monthly',
          durationMonths: 1,
          basePrice: 499,
          discountPercent: 0,
          finalPrice: 499,
        },
      ],
      features: [{ text: 'Coach profile, gallery, photos and videos' }],
    });
    expect(defaultPremiumPlan(unmarked.plans)?.planName).toBe('Monthly');
    expect(planMinimumMonths(unmarked.plans[0])).toBe(1);
    expect(unmarked.features).toEqual(['Coach profile, gallery, photos and videos']);
    expect(defaultPremiumPlan([])).toBeNull();
  });

  it('hides a missing promo and drops empty plan rows', () => {
    const catalog = mapPremiumCatalog({ plans: [null, {}], promo: null });
    expect(catalog.plans).toEqual([]);
    expect(catalog.promo).toBeNull();
    expect(
      planSelectionKey({
        planName: 'Monthly',
        durationMonths: 1,
        basePrice: 499,
        discountPercent: 0,
        finalPrice: 499,
      }),
    ).toBe('Monthly:1:499');
  });
});

describe('plan pricing display', () => {
  it('turns the period price into a monthly rate', () => {
    expect(
      planMonthlyRate({
        planName: 'Half yearly',
        durationMonths: 6,
        basePrice: 2994,
        discountPercent: 25,
        finalPrice: 2245.5,
      }),
    ).toBe(499);
    expect(subscriptionMonthLabel(1)).toBe('1 month');
    expect(subscriptionMonthLabel(6)).toBe('6 months');
  });

  it('totals the minimum term as monthly times months', () => {
    const yearly = {
      planName: 'Yearly',
      durationMonths: 12,
      basePrice: 5988,
      discountPercent: 30,
      finalPrice: 4188,
    };
    expect(planPayableMonthly(yearly)).toBe(349);
    expect(planTermTotal(yearly)).toBe(4188);
    expect(formatInr(planPayableMonthly(yearly))).toBe('₹349');
    expect(formatInr(planTermTotal(yearly))).toBe('₹4,188');

    const quarterly = {
      planName: 'Quarterly',
      durationMonths: 3,
      minimumMonths: 3,
      basePrice: 1497,
      discountPercent: 20,
      finalPrice: 1197,
    };
    expect(formatInr(planPayableMonthly(quarterly))).toBe('₹399');
    expect(planTermTotal(quarterly)).toBe(1197);

    const partialYear = {
      planName: 'Yearly',
      durationMonths: 12,
      minimumMonths: 3,
      basePrice: 5988,
      discountPercent: 30,
      finalPrice: 4188,
    };
    expect(planTermTotal(partialYear)).toBe(1047);
    expect(formatInr(planOriginalTermTotal(partialYear))).toBe('₹1,497');
    expect(formatInr(planPayableMonthly(partialYear))).toBe('₹349');
  });

  it('formats rupees and only calls out a real discount', () => {
    expect(formatInr(499)).toBe('₹499');
    expect(formatInr(1197.6)).toBe('₹1,197.60');
    expect(formatInr(2245.5)).toBe('₹2,245.50');
    expect(formatInr(4191.6)).toBe('₹4,191.60');
    expect(
      planShowsDiscount({
        planName: 'Monthly',
        durationMonths: 1,
        basePrice: 499,
        discountPercent: 0,
        finalPrice: 499,
      }),
    ).toBe(false);
    expect(
      planShowsDiscount({
        planName: 'Yearly',
        durationMonths: 12,
        basePrice: 5988,
        discountPercent: 30,
        finalPrice: 4191.6,
      }),
    ).toBe(true);
  });

  it('strikes the base rate only when the final price is lower', () => {
    const monthly = {
      planName: 'Monthly',
      durationMonths: 1,
      basePrice: 499,
      discountPercent: 0,
      finalPrice: 499,
    };
    expect(planShowsDiscount(monthly)).toBe(false);
    expect(planDiscountOffPercent(monthly)).toBeNull();
    expect(formatInr(planMonthlyRate(monthly))).toBe('₹499');
    expect(formatInr(planPayableMonthly(monthly))).toBe('₹499');
    expect(formatInr(planOriginalTermTotal(monthly))).toBe('₹499');
    expect(formatInr(planTermTotal(monthly))).toBe('₹499');

    const quarterly = {
      planName: 'Quarterly',
      durationMonths: 3,
      basePrice: 1497,
      discountPercent: 20,
      finalPrice: 1197,
    };
    expect(planShowsDiscount(quarterly)).toBe(true);
    expect(planDiscountOffPercent(quarterly)).toBe(20);
    expect(formatInr(planMonthlyRate(quarterly))).toBe('₹499');
    expect(formatInr(planPayableMonthly(quarterly))).toBe('₹399');
    expect(formatInr(planOriginalTermTotal(quarterly))).toBe('₹1,497');
    expect(formatInr(planTermTotal(quarterly))).toBe('₹1,197');

    const halfYearly = {
      planName: 'Half yearly',
      durationMonths: 6,
      basePrice: 2994,
      discountPercent: 25,
      finalPrice: 2244,
    };
    expect(planDiscountOffPercent(halfYearly)).toBe(25);
    expect(formatInr(planMonthlyRate(halfYearly))).toBe('₹499');
    expect(formatInr(planPayableMonthly(halfYearly))).toBe('₹374');
    expect(formatInr(planOriginalTermTotal(halfYearly))).toBe('₹2,994');
    expect(formatInr(planTermTotal(halfYearly))).toBe('₹2,244');

    const yearly = {
      planName: 'Yearly',
      durationMonths: 12,
      basePrice: 5988,
      discountPercent: 30,
      finalPrice: 4188,
    };
    expect(planDiscountOffPercent(yearly)).toBe(30);
    expect(formatInr(planMonthlyRate(yearly))).toBe('₹499');
    expect(formatInr(planPayableMonthly(yearly))).toBe('₹349');
    expect(formatInr(planOriginalTermTotal(yearly))).toBe('₹5,988');
    expect(formatInr(planTermTotal(yearly))).toBe('₹4,188');
  });

  it('ignores a percent that does not change the price', () => {
    const fullPrice = {
      planName: 'Monthly',
      durationMonths: 1,
      basePrice: 499,
      discountPercent: 20,
      finalPrice: 499,
    };
    expect(planShowsDiscount(fullPrice)).toBe(false);
    expect(planDiscountOffPercent(fullPrice)).toBeNull();
  });

  it('labels the percent from the price gap when the stored percent disagrees', () => {
    const plan = {
      planName: 'Quarterly',
      durationMonths: 3,
      basePrice: 1500,
      discountPercent: 50,
      finalPrice: 1200,
    };
    expect(planDiscountOffPercent(plan)).toBe(20);
    expect(formatInr(planOriginalTermTotal(plan))).toBe('₹1,500');
    expect(formatInr(planTermTotal(plan))).toBe('₹1,200');
  });

  it('derives the original term from the stored percent when base price is missing', () => {
    const catalog = mapPremiumCatalog({
      plans: [
        {
          planName: 'Quarterly',
          durationMonths: 3,
          discountPercent: 20,
          finalPrice: 1197,
        },
      ],
    });
    const plan = catalog.plans[0];
    expect(plan.basePrice).toBeCloseTo(1496.25);
    expect(planShowsDiscount(plan)).toBe(true);
    expect(planDiscountOffPercent(plan)).toBe(20);
    expect(formatInr(planOriginalTermTotal(plan))).toBe('₹1,496.25');
    expect(formatInr(planTermTotal(plan))).toBe('₹1,197');
  });
});

describe('buildCoachPaymentUrl', () => {
  it('uses the payment env and appends the coach', () => {
    process.env.EXPO_PUBLIC_PAYMENT_URL = 'https://pay.example.com/checkout';
    expect(buildCoachPaymentUrl({ coachId: '42', coachCode: 'abc' })).toBe(
      'https://pay.example.com/checkout?coachId=42&coachCode=abc',
    );
  });

  it('falls back to the public site and keeps an existing query', () => {
    delete process.env.EXPO_PUBLIC_PAYMENT_URL;
    process.env.EXPO_PUBLIC_WEB_BASE_URL = 'https://mera-coach.com/';
    expect(buildCoachPaymentUrl({ coachId: 7, coachCode: 'ch' })).toBe(
      'https://mera-coach.com/premium?coachId=7&coachCode=ch',
    );
    process.env.EXPO_PUBLIC_PAYMENT_URL = 'https://mera-coach.com/premium?src=app';
    expect(buildCoachPaymentUrl({ coachId: 7 })).toBe(
      'https://mera-coach.com/premium?src=app&coachId=7',
    );
  });
});

describe('resolveAddClientAccess', () => {
  it('opens the wizard when a subscription is not required', () => {
    expect(resolveAddClientAccess(false, false)).toBe('wizard');
    expect(resolveAddClientAccess(false, true)).toBe('wizard');
  });

  it('sends unpaid coaches to the paywall only when the hard limit is on', () => {
    expect(resolveAddClientAccess(true, false)).toBe('paywall');
    expect(resolveAddClientAccess(true, true)).toBe('wizard');
  });
});

describe('isSubscriptionRequired', () => {
  it('is on for yes, true, or 1', () => {
    for (const value of ['yes', 'YES', ' Yes ', 'true', 'TRUE', 'True', '1', ' 1 ']) {
      process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED = value;
      expect(isSubscriptionRequired()).toBe(true);
    }
  });

  it('is off for no, false, 0, empty, and unset', () => {
    for (const value of ['no', 'NO', 'false', 'FALSE', '0', '', '  ', 'maybe']) {
      process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED = value;
      expect(isSubscriptionRequired()).toBe(false);
    }
    delete process.env.EXPO_PUBLIC_SUBSCRIPTION_REQUIRED;
    expect(isSubscriptionRequired()).toBe(false);
  });
});

describe('subscriptionCheckErrorMessage', () => {
  it('replaces a generic not-found response', () => {
    const err = new ApiError('Not Found', 404, { title: 'Not Found', status: 404 });
    expect(subscriptionCheckErrorMessage(err)).toBe(SUBSCRIPTION_STATUS_UNAVAILABLE);
  });

  it('keeps a connection failure', () => {
    const err = new ApiError('Network request failed', -1);
    expect(subscriptionCheckErrorMessage(err)).toBe(FRIENDLY_NETWORK);
  });
});

describe('premiumPlansErrorMessage', () => {
  it('replaces a generic not-found response', () => {
    const err = new ApiError('Not Found', 404, { title: 'Not Found', status: 404 });
    expect(premiumPlansErrorMessage(err)).toBe(PREMIUM_PLANS_UNAVAILABLE);
  });

  it('keeps a connection failure and swaps only the generic refresh sentence', () => {
    const err = new ApiError('Network request failed', -1);
    expect(premiumPlansErrorMessage(err)).toBe(FRIENDLY_NETWORK);
    expect(premiumPlansRefreshMessage(FRIENDLY_NOT_FOUND)).toBe(PREMIUM_PLANS_UNAVAILABLE);
    expect(premiumPlansRefreshMessage(null)).toBeNull();
    expect(premiumPlansRefreshMessage('Could not refresh. Please try again.')).toBe(
      'Could not refresh. Please try again.',
    );
  });
});
