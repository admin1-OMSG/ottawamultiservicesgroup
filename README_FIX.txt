Fix v0.8.6 - invoice email error

Cause:
ReferenceError: businessAddress is not defined

This patch defines BUSINESS_ADDRESS, BUSINESS_PHONE and GST_HST_NUMBER safely from Supabase secrets, with defaults.

Deploy:
npx supabase functions deploy send-crm-email --no-verify-jwt

Optional Supabase Edge Function secrets:
BUSINESS_ADDRESS
BUSINESS_PHONE
GST_HST_NUMBER
