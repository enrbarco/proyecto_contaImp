-- ContaImp · Estructura inicial. Ejecutar en una base de datos vacía.
create extension if not exists pgcrypto;
create table if not exists users(id uuid primary key default gen_random_uuid(),name text not null,email text not null unique,password_hash text not null,role text not null check(role in ('cliente','contador','administrador')),active boolean not null default true,created_at timestamptz not null default now());
create table if not exists companies(id uuid primary key default gen_random_uuid(),name text not null unique);
create table if not exists user_company(user_id uuid not null references users(id) on delete cascade,company_id uuid not null references companies(id) on delete cascade,primary key(user_id,company_id));
create table if not exists periods(id uuid primary key default gen_random_uuid(),company_id uuid not null references companies(id),month text not null check(month ~ '^\d{4}-(0[1-9]|1[0-2])$'),status text not null default 'abierto' check(status in ('abierto','cerrado')),closed_by uuid references users(id),closed_at timestamptz,unique(company_id,month));
create table if not exists templates(id uuid primary key default gen_random_uuid(),code text not null unique,name text not null);
create table if not exists template_activities(id uuid primary key default gen_random_uuid(),template_id uuid not null references templates(id),description text not null,position integer not null default 0);
create table if not exists forms(id uuid primary key default gen_random_uuid(),company_id uuid not null references companies(id),period_id uuid not null references periods(id),template_id uuid not null references templates(id),created_by uuid not null references users(id),created_at timestamptz not null default now(),unique(period_id,template_id));
create table if not exists activities(id uuid primary key default gen_random_uuid(),form_id uuid not null references forms(id) on delete cascade,description text not null,position integer not null default 0,verified boolean not null default false,hidden boolean not null default false,note text not null default '',due_date date);
create table if not exists audit_log(id uuid primary key default gen_random_uuid(),actor uuid references users(id),entity text not null,entity_id uuid,action text not null,changed_at timestamptz not null default now(),details jsonb);
-- Bloqueo a nivel de base de datos (no depende del frontend).
create or replace function assert_open_form() returns trigger language plpgsql as $$
declare f_id uuid; p_status text;
begin
  f_id := case when TG_OP='DELETE' then old.form_id else new.form_id end;
  select p.status into p_status from forms f join periods p on p.id=f.period_id where f.id=f_id;
  if p_status <> 'abierto' then raise exception 'Período cerrado'; end if;
  return case when TG_OP='DELETE' then old else new end;
end $$;
drop trigger if exists block_closed_activities on activities;
create trigger block_closed_activities before insert or update or delete on activities for each row execute function assert_open_form();
create or replace function assert_open_period_on_form() returns trigger language plpgsql as $$
declare status_now text;
begin
 select status into status_now from periods where id=coalesce(new.period_id,old.period_id);
 if status_now <> 'abierto' then raise exception 'Período cerrado'; end if;
 return case when TG_OP='DELETE' then old else new end;
end $$;
drop trigger if exists block_closed_forms on forms;
create trigger block_closed_forms before insert or update or delete on forms for each row execute function assert_open_period_on_form();
insert into templates(code,name) values('cierre','Cierre mensual'),('provisiones','Provisiones'),('amortizaciones','Amortizaciones'),('depreciaciones','Depreciaciones'),('cronograma','Cronograma') on conflict(code) do nothing;
-- Actividades iniciales basadas solo en las referencias compartidas. El equipo debe validarlas con los Excel originales.
insert into template_activities(template_id,description,position)
select t.id,v.description,v.position from (values
('cierre','Revisión de facturas de almacenes',1),('cierre','Facturación administración',2),('cierre','Asientos de provisión',3),('cierre','Proceso de cierre contable',4),
('provisiones','Agua',1),('provisiones','Electricidad',2),('provisiones','Teléfono',3),('provisiones','Servicio de guardianía',4),
('amortizaciones','Licencias de Microsoft',1),('amortizaciones','Seguros prepagados',2),('amortizaciones','Otros gastos',3),
('depreciaciones','NIIF 16',1),('depreciaciones','Manual - corte hasta 2018',2),('depreciaciones','Módulo - corte desde 2018',3),
('cronograma','Revisión de facturas de almacenes',1),('cronograma','Facturación administración',2),('cronograma','Asientos de provisión',3)
) v(code,description,position) join templates t on t.code=v.code
where not exists (select 1 from template_activities x where x.template_id=t.id and x.position=v.position);
