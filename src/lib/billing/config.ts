export type PlanCode = "PRO";

type PlanConfig = {
  code: PlanCode;
  productId: string;
};

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export function getDodoConfig() {
  return {
    apiKey: requireEnv("DODO_PAYMENTS_API_KEY"),
    environment: process.env.DODO_PAYMENTS_ENVIRONMENT ?? "test_mode",
    returnUrlBase:
      process.env.NEXT_PUBLIC_APP_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      "http://localhost:3000",
    webhookKey: process.env.DODO_PAYMENTS_WEBHOOK_KEY ?? requireEnv("DODO_PAYMENTS_WEBHOOK_SECRET"),
  } as const;
}

export function getPlanConfig(planCode: PlanCode): PlanConfig {
  const plans: Record<PlanCode, PlanConfig> = {
    PRO: {
      code: "PRO",
      productId:
        process.env.DODO_PAYMENTS_PLAN_PRODUCT_ID ??
        process.env.DODO_PAYMENTS_PLAN_WORLD_PRODUCT_ID ??
        requireEnv("DODO_PAYMENTS_PLAN_IN_PRODUCT_ID"),
    },
  };

  return plans[planCode];
}
