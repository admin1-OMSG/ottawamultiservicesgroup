-- OMSG v2.5.2 - Expanded Ottawa/Gatineau postal FSA service-area mapping
-- Source basis: Canada Post FSA / delivery-office listings.
-- Scope: Ottawa, Gatineau and common surrounding service areas.
-- FSA = first 3 characters of a Canadian postal code.
--
-- Important:
-- Some rural FSAs (for example K0A or J0X) cover multiple communities.
-- They are deliberately stored with a broad service-area label instead of
-- pretending the FSA uniquely identifies one municipality.

insert into public.postal_fsa_service_areas (fsa, city, province)
values
  -- OTTAWA / CENTRAL / EAST / SOUTH
  ('K1A','Ottawa','Ontario'),
  ('K1B','Ottawa','Ontario'),
  ('K1C','Orleans','Ontario'),
  ('K1E','Orleans','Ontario'),
  ('K1G','Ottawa','Ontario'),
  ('K1H','Ottawa','Ontario'),
  ('K1J','Ottawa','Ontario'),
  ('K1K','Ottawa','Ontario'),
  ('K1L','Ottawa','Ontario'),
  ('K1M','Ottawa','Ontario'),
  ('K1N','Ottawa','Ontario'),
  ('K1P','Ottawa','Ontario'),
  ('K1R','Ottawa','Ontario'),
  ('K1S','Ottawa','Ontario'),
  ('K1T','Ottawa','Ontario'),
  ('K1V','Ottawa','Ontario'),
  ('K1W','Orleans','Ontario'),
  ('K1X','Ottawa','Ontario'),
  ('K1Y','Ottawa','Ontario'),
  ('K1Z','Ottawa','Ontario'),

  -- OTTAWA WEST / NEPEAN / KANATA / STITTSVILLE
  ('K2A','Ottawa','Ontario'),
  ('K2B','Ottawa','Ontario'),
  ('K2C','Ottawa','Ontario'),
  ('K2E','Ottawa','Ontario'),
  ('K2G','Ottawa','Ontario'),
  ('K2H','Nepean','Ontario'),
  ('K2J','Nepean','Ontario'),
  ('K2K','Kanata','Ontario'),
  ('K2L','Kanata','Ontario'),
  ('K2M','Kanata','Ontario'),
  ('K2P','Ottawa','Ontario'),
  ('K2R','Nepean','Ontario'),
  ('K2S','Stittsville','Ontario'),
  ('K2T','Kanata','Ontario'),
  ('K2V','Kanata','Ontario'),
  ('K2W','Kanata','Ontario'),

  -- EAST / SOUTH-EAST / RURAL OTTAWA AREA
  ('K4A','Orleans','Ontario'),
  ('K4B','Navan','Ontario'),
  ('K4C','Cumberland','Ontario'),
  ('K4K','Rockland','Ontario'),
  ('K4M','Manotick','Ontario'),
  ('K4P','Manotick','Ontario'),
  ('K4R','Russell','Ontario'),
  ('K0A','Ottawa rural / K0A','Ontario'),

  -- GATINEAU / OUTAOUAIS
  ('J8L','Buckingham','Quebec'),
  ('J8M','Masson-Angers','Quebec'),
  ('J8N','Buckingham','Quebec'),
  ('J8P','Gatineau','Quebec'),
  ('J8R','Gatineau','Quebec'),
  ('J8T','Gatineau','Quebec'),
  ('J8V','Gatineau','Quebec'),
  ('J8X','Hull','Quebec'),
  ('J8Y','Hull','Quebec'),
  ('J8Z','Hull','Quebec'),
  ('J9A','Hull','Quebec'),
  ('J9B','Chelsea','Quebec'),
  ('J9H','Aylmer','Quebec'),
  ('J9J','Aylmer','Quebec'),
  ('J0X','Outaouais rural / J0X','Quebec')

on conflict (fsa) do update
set city = excluded.city,
    province = excluded.province;

-- Verification
select fsa, city, province
from public.postal_fsa_service_areas
order by province, city, fsa;
