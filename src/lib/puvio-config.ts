// Public Puvio app identifiers and endpoints. Secrets never belong in this file.
export const PUVIO_APP_ID = "1d41a189-0b9c-40b5-8563-bf7cfe377a6c";
export const PUVIO_ISSUER = "https://www.puvio.ai";
export const PUVIO_AUTHORIZE_URL = `${PUVIO_ISSUER}/oauth/authorize`;
export const PUVIO_TOKEN_URL = `${PUVIO_ISSUER}/api/public/oauth/token`;
export const PUVIO_USERINFO_URL = `${PUVIO_ISSUER}/api/public/oauth/userinfo`;
export const PUVIO_CHECKOUT_URL = `${PUVIO_ISSUER}/api/public/billing/checkout-sessions`;
export const PUVIO_REPORT_URL = `${PUVIO_ISSUER}/api/public/onboarding/report`;
export const PUVIO_BILLING_RETURN_PATH = "/billing/return";
