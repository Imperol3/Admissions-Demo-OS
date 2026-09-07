-- Optional example seed for validating the bootstrap.
-- Run only after 001_init_admissions_demo_os.sql.

insert into public.demo_tenants (
  slug,
  name,
  website,
  status,
  config
)
values (
  'example-institution',
  'Example Institution',
  'https://example.edu',
  'created',
  '{
    "country": "Kenya",
    "default_currency": "KES",
    "institution_type": "university",
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
