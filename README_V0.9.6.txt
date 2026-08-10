CRM v0.9.6 - Quote photos for every client service

This patch replaces src/components/quote-funnel.tsx.
The shared client ContactForm contains the optional photo uploader, so every residential and commercial service uses it.

Verification (CMD):
findstr /I /C:"Photos du travail" src\components\quote-funnel.tsx
findstr /I /C:"service_request_photos" src\components\quote-funnel.tsx

No Supabase migration is required if v0.9/v0.9.1 has already been applied.
