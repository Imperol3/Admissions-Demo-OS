-- Optional example seed for validating the bootstrap.
-- Run only after 001_init_admissions_demo_os.sql.
-- Example institution: University of Nairobi (Kenya public university).

insert into public.demo_tenants (
  slug,
  name,
  website,
  status,
  config
)
values (
  'university-of-nairobi',
  'University of Nairobi',
  'https://www.uonbi.ac.ke',
  'created',
  '{
    "country": "Kenya",
    "default_currency": "KES",
    "institution_type": "public_university",
    "reply_mode": "draft_only"
  }'::jsonb
)
on conflict (slug) do update
set
  name = excluded.name,
  website = excluded.website,
  config = excluded.config,
  updated_at = now()
returning *;
