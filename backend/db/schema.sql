-- StreetSide database schema (PostgreSQL / Supabase).
--
-- Everything lives in its own `streetside` schema so it can share a Supabase
-- project with other apps without touching their tables. The API connects
-- with the project's database role (server side only); Row Level Security is
-- enabled on every table with no policies, so the Supabase public/anon API
-- cannot read or write any of this data.
--
-- Safe to re-run: every statement is idempotent.

create schema if not exists streetside;

-- ---------------------------------------------------------------- users
create table if not exists streetside.users (
  id                             uuid primary key default gen_random_uuid(),
  name                           text not null check (char_length(name) <= 100),
  email                          text not null,
  password_hash                  text not null,
  role                           text not null default 'customer' check (role in ('customer', 'vendor', 'admin')),
  status                         text not null default 'active' check (status in ('active', 'suspended')),
  avatar                         text not null default 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?auto=compress&cs=tinysrgb&w=200',
  phone                          text,
  vendor_id                      uuid,
  points                         integer not null default 100 check (points >= 0),
  refresh_token_version          integer not null default 0,
  email_verified                 boolean not null default false,
  email_verification_token_hash  text,
  email_verification_expires     timestamptz,
  password_reset_token_hash      text,
  password_reset_expires         timestamptz,
  created_at                     timestamptz not null default now(),
  updated_at                     timestamptz not null default now()
);
create unique index if not exists users_email_key on streetside.users (email);
create index if not exists users_role_idx on streetside.users (role);
create index if not exists users_vendor_idx on streetside.users (vendor_id);

-- -------------------------------------------------------------- vendors
create table if not exists streetside.vendors (
  id                     uuid primary key default gen_random_uuid(),
  owner_id               uuid references streetside.users (id) on delete set null,
  name                   text not null check (char_length(name) <= 120),
  cuisine                text not null,
  categories             text[] not null default '{}',
  description            text not null check (char_length(description) <= 300),
  long_description       text not null default '' check (char_length(long_description) <= 2000),
  image                  text not null,
  logo                   text not null default '',
  rating                 double precision not null default 0 check (rating between 0 and 5),
  review_count           integer not null default 0 check (review_count >= 0),
  price_range            double precision[] not null default '{50,200}',
  location_address       text not null,
  location_area          text not null,
  location_city          text not null default 'Vijayawada',
  location_lat           double precision not null check (location_lat between -90 and 90),
  location_lng           double precision not null check (location_lng between -180 and 180),
  hours_open             text not null,
  hours_close            text not null,
  hours_days             text not null default 'Mon - Sun',
  phone                  text not null,
  secondary_phone        text not null default '',
  website                text not null default '',
  social_instagram       text not null default '',
  social_facebook        text not null default '',
  social_whatsapp        text not null default '',
  manual_closed          boolean not null default false,
  veg                    text not null check (veg in ('pure-veg', 'non-veg', 'both')),
  specialties            text[] not null default '{}',
  views                  integer not null default 0 check (views >= 0),
  popularity             double precision not null default 0 check (popularity between 0 and 100),
  is_active              boolean not null default true,
  approval_status        text not null default 'pending' check (approval_status in ('pending', 'approved', 'rejected')),
  rejection_reason       text check (char_length(rejection_reason) <= 300),
  fssai_license_number   text check (char_length(fssai_license_number) <= 30),
  hygiene_rating         double precision check (hygiene_rating between 1 and 5),
  hygiene_verified       boolean not null default false,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);
create index if not exists vendors_owner_idx on streetside.vendors (owner_id);
create index if not exists vendors_categories_idx on streetside.vendors using gin (categories);
create index if not exists vendors_veg_idx on streetside.vendors (veg);
create index if not exists vendors_listing_idx on streetside.vendors (is_active, approval_status);
create index if not exists vendors_rating_idx on streetside.vendors (rating desc);

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'users_vendor_id_fkey') then
    alter table streetside.users
      add constraint users_vendor_id_fkey foreign key (vendor_id)
      references streetside.vendors (id) on delete set null;
  end if;
end $$;

-- ----------------------------------------------------------- menu_items
create table if not exists streetside.menu_items (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references streetside.vendors (id) on delete cascade,
  name         text not null check (char_length(name) <= 120),
  description  text not null default '' check (char_length(description) <= 500),
  price        double precision not null check (price >= 0),
  category     text not null,
  veg          text not null check (veg in ('veg', 'non-veg', 'egg')),
  image        text not null,
  popular      boolean not null default false,
  available    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists menu_items_vendor_category_idx on streetside.menu_items (vendor_id, category);

-- -------------------------------------------------------------- reviews
create table if not exists streetside.reviews (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references streetside.users (id) on delete cascade,
  vendor_id   uuid not null references streetside.vendors (id) on delete cascade,
  rating      integer not null check (rating between 1 and 5),
  comment     text not null check (char_length(comment) between 1 and 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists reviews_user_vendor_key on streetside.reviews (user_id, vendor_id);
create index if not exists reviews_vendor_idx on streetside.reviews (vendor_id);

-- --------------------------------------------------------------- offers
create table if not exists streetside.offers (
  id           uuid primary key default gen_random_uuid(),
  vendor_id    uuid not null references streetside.vendors (id) on delete cascade,
  title        text not null check (char_length(title) <= 150),
  description  text not null check (char_length(description) <= 300),
  discount     text not null check (char_length(discount) <= 50),
  code         text not null check (char_length(code) <= 30),
  expiry       timestamptz not null,
  conditions   text not null default 'No conditions' check (char_length(conditions) <= 300),
  color        text not null default 'from-brand-500 to-brand-700',
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists offers_vendor_active_idx on streetside.offers (vendor_id, is_active);
-- An *active* offer code is unique per vendor; deactivated ones free the code.
create unique index if not exists vendor_code_active_unique
  on streetside.offers (vendor_id, code) where is_active;

-- --------------------------------------------------------------- events
create table if not exists streetside.events (
  id                uuid primary key default gen_random_uuid(),
  name              text not null check (char_length(name) <= 150),
  description       text not null check (char_length(description) <= 300),
  long_description  text not null default '' check (char_length(long_description) <= 2000),
  image             text not null,
  date              timestamptz not null,
  time              text not null,
  location          text not null,
  area              text not null,
  vendors           uuid[] not null default '{}',
  featured          boolean not null default false,
  created_by        uuid references streetside.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists events_date_idx on streetside.events (date);
create index if not exists events_featured_idx on streetside.events (featured);

-- ---------------------------------------------------------- food_trails
create table if not exists streetside.food_trails (
  id            uuid primary key default gen_random_uuid(),
  name          text not null check (char_length(name) <= 150),
  description   text not null check (char_length(description) <= 300),
  image         text not null,
  stops         jsonb not null default '[]',
  duration      text not null,
  distance      text not null,
  difficulty    text not null check (difficulty in ('Easy', 'Moderate', 'Foodie')),
  rating        double precision not null default 0 check (rating between 0 and 5),
  review_count  integer not null default 0 check (review_count >= 0),
  created_by    uuid references streetside.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ------------------------------------------------------------ favorites
create table if not exists streetside.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references streetside.users (id) on delete cascade,
  vendor_id   uuid not null references streetside.vendors (id) on delete cascade,
  created_at  timestamptz not null default now()
);
create unique index if not exists favorites_user_vendor_key on streetside.favorites (user_id, vendor_id);
create index if not exists favorites_vendor_idx on streetside.favorites (vendor_id);

-- -------------------------------------------------------------- reports
create table if not exists streetside.reports (
  id          uuid primary key default gen_random_uuid(),
  type        text not null check (type in ('review', 'vendor', 'user')),
  target_id   uuid not null,
  reason      text not null check (char_length(reason) <= 500),
  status      text not null default 'pending' check (status in ('pending', 'resolved', 'dismissed')),
  reporter_id uuid not null references streetside.users (id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists reports_status_idx on streetside.reports (status);
create index if not exists reports_target_idx on streetside.reports (type, target_id);

-- ----------------------------------------------------- reward_activities
create table if not exists streetside.reward_activities (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references streetside.users (id) on delete cascade,
  action       text not null check (action in ('registered', 'wrote_review', 'added_favorite')),
  description  text not null check (char_length(description) <= 200),
  points       integer not null check (points >= 0),
  target_id    uuid references streetside.vendors (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index if not exists reward_activities_user_idx on streetside.reward_activities (user_id);
-- Each (user, action, vendor) can only ever earn points once.
create unique index if not exists unique_user_action_target
  on streetside.reward_activities (user_id, action, target_id) where target_id is not null;

-- ---------------------------------------------------------------- media
create table if not exists streetside.media (
  id          uuid primary key default gen_random_uuid(),
  data        bytea not null,
  mime_type   text not null check (mime_type in ('image/png', 'image/jpeg', 'image/webp', 'image/gif')),
  uploader_id uuid not null references streetside.users (id) on delete cascade,
  size_bytes  integer not null,
  created_at  timestamptz not null default now()
);
create index if not exists media_uploader_idx on streetside.media (uploader_id);

-- ----------------------------------------------------------- audit_logs
create table if not exists streetside.audit_logs (
  id          uuid primary key default gen_random_uuid(),
  actor_id    uuid not null references streetside.users (id) on delete cascade,
  action      text not null,
  target      text not null,
  meta        jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists audit_logs_actor_idx on streetside.audit_logs (actor_id);
create index if not exists audit_logs_action_idx on streetside.audit_logs (action);
create index if not exists audit_logs_target_idx on streetside.audit_logs (target);

-- ------------------------------------------------- lock out the public API
alter table streetside.users             enable row level security;
alter table streetside.vendors           enable row level security;
alter table streetside.menu_items        enable row level security;
alter table streetside.reviews           enable row level security;
alter table streetside.offers            enable row level security;
alter table streetside.events            enable row level security;
alter table streetside.food_trails       enable row level security;
alter table streetside.favorites         enable row level security;
alter table streetside.reports           enable row level security;
alter table streetside.reward_activities enable row level security;
alter table streetside.media             enable row level security;
alter table streetside.audit_logs        enable row level security;
