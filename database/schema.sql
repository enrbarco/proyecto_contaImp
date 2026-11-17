-- =====================================================================
-- ContaImp · Esquema completo de la base de datos (PostgreSQL)
--
-- Se puede ejecutar en una base vacía o en una existente: todo usa
-- "if not exists" / "create or replace", así que no borra datos.
--   psql -v ON_ERROR_STOP=1 -d contaimp -f database/schema.sql
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Usuarios y empresas ----------

create table if not exists users (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  email            text not null unique,
  password_hash    text not null,
  role             text not null check (role in ('cliente', 'contador', 'administrador')),
  active           boolean not null default true,
  password_version integer not null default 0, -- sube al cambiar clave/rol/estado: invalida sesiones
  created_at       timestamptz not null default now()
);
alter table users add column if not exists password_version integer not null default 0;

create table if not exists companies (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table if not exists user_company (
  user_id    uuid not null references users(id) on delete cascade,
  company_id uuid not null references companies(id) on delete cascade,
  primary key (user_id, company_id)
);

-- HU-06: enlaces de recuperación de contraseña (se guarda solo el hash del token).
create table if not exists password_reset_tokens (
  id         bigserial primary key,
  user_id    uuid not null references users(id) on delete cascade,
  token_hash char(64) not null unique,
  expires_at timestamptz not null,
  used_at    timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_password_reset_user on password_reset_tokens(user_id);

-- ---------- Períodos, plantillas y formularios ----------

create table if not exists periods (
  id         uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  month      text not null check (month ~ '^\d{4}-(0[1-9]|1[0-2])$'), -- formato AAAA-MM
  status     text not null default 'abierto' check (status in ('abierto', 'cerrado')),
  closed_by  uuid references users(id),
  closed_at  timestamptz,
  unique (company_id, month)
);

create table if not exists templates (
  id   uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null
);

create table if not exists template_activities (
  id          uuid primary key default gen_random_uuid(),
  template_id uuid not null references templates(id),
  description text not null,
  position    integer not null default 0
);

create table if not exists forms (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references companies(id),
  period_id   uuid not null references periods(id),
  template_id uuid not null references templates(id),
  created_by  uuid not null references users(id),
  created_at  timestamptz not null default now(),
  unique (period_id, template_id)
);

create table if not exists activities (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references forms(id) on delete cascade,
  description text not null,
  position    integer not null default 0,
  verified    boolean not null default false,
  hidden      boolean not null default false,
  note        text not null default '',
  due_date    date
);
create index if not exists idx_activities_form on activities(form_id);

-- ---------- Bitácora ----------

create table if not exists audit_log (
  id         uuid primary key default gen_random_uuid(),
  actor      uuid references users(id),
  entity     text not null,
  entity_id  uuid,
  action     text not null,
  changed_at timestamptz not null default now(),
  details    jsonb
);
create index if not exists idx_audit_log_changed_at on audit_log(changed_at desc);

-- ---------- Bloqueo de períodos cerrados (no depende del frontend ni de la API) ----------

create or replace function assert_period_is_open(period_id_to_check uuid) returns void
language plpgsql as $$
declare current_status text;
begin
  select p.status into current_status from periods p where p.id = period_id_to_check for update;
  if current_status is distinct from 'abierto' then
    raise exception 'Período cerrado';
  end if;
end $$;

-- Actividades: no se pueden crear, editar ni borrar si su período está cerrado.
create or replace function assert_open_form() returns trigger
language plpgsql as $$
declare target_form_id uuid; target_period_id uuid; form_ids uuid[];
begin
  if tg_op = 'INSERT' then form_ids := array[new.form_id];
  elsif tg_op = 'DELETE' then form_ids := array[old.form_id];
  else form_ids := array[old.form_id, new.form_id];
  end if;

  -- Bloqueos en orden fijo para evitar interbloqueos.
  for target_form_id in select distinct f_id from unnest(form_ids) as x(f_id) order by f_id loop
    perform 1 from forms f where f.id = target_form_id for update;
  end loop;
  for target_period_id in select distinct f.period_id from forms f where f.id = any(form_ids) order by f.period_id loop
    perform assert_period_is_open(target_period_id);
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists block_closed_activities on activities;
create trigger block_closed_activities
  before insert or update or delete on activities
  for each row execute function assert_open_form();

-- Formularios: igual que las actividades.
create or replace function assert_open_period_on_form() returns trigger
language plpgsql as $$
declare target_period_id uuid; period_ids uuid[];
begin
  if tg_op = 'INSERT' then period_ids := array[new.period_id];
  elsif tg_op = 'DELETE' then period_ids := array[old.period_id];
  else period_ids := array[old.period_id, new.period_id];
  end if;

  for target_period_id in select distinct p_id from unnest(period_ids) as x(p_id) order by p_id loop
    perform assert_period_is_open(target_period_id);
  end loop;

  if tg_op = 'DELETE' then return old; end if;
  return new;
end $$;

drop trigger if exists block_closed_forms on forms;
create trigger block_closed_forms
  before insert or update or delete on forms
  for each row execute function assert_open_period_on_form();

-- ---------- Datos iniciales: plantillas de control ----------

insert into templates(code, name) values
  ('cierre', 'Cierre mensual'),
  ('provisiones', 'Provisiones'),
  ('amortizaciones', 'Amortizaciones'),
  ('depreciaciones', 'Depreciaciones'),
  ('cronograma', 'Cronograma')
on conflict (code) do nothing;

insert into template_activities(template_id, description, position)
select t.id, v.description, v.position
from (values
  ('cierre', 'Revisión de facturas de almacenes', 1),
  ('cierre', 'Facturación administración', 2),
  ('cierre', 'Asientos de provisión', 3),
  ('cierre', 'Proceso de cierre contable', 4),
  ('provisiones', 'Agua', 1),
  ('provisiones', 'Electricidad', 2),
  ('provisiones', 'Teléfono', 3),
  ('provisiones', 'Servicio de guardianía', 4),
  ('amortizaciones', 'Licencias de Microsoft', 1),
  ('amortizaciones', 'Seguros prepagados', 2),
  ('amortizaciones', 'Otros gastos', 3),
  ('depreciaciones', 'NIIF 16', 1),
  ('depreciaciones', 'Manual - corte hasta 2018', 2),
  ('depreciaciones', 'Módulo - corte desde 2018', 3),
  ('cronograma', 'Revisión de facturas de almacenes', 1),
  ('cronograma', 'Facturación administración', 2),
  ('cronograma', 'Asientos de provisión', 3)
) as v(code, description, position)
join templates t on t.code = v.code
where not exists (
  select 1 from template_activities x where x.template_id = t.id and x.position = v.position
);
