-- Ejecutar solamente si falta la tabla de bitácora en una base existente.
CREATE TABLE IF NOT EXISTS audit_log (id uuid primary key default gen_random_uuid(), actor uuid references users(id), entity text not null, entity_id uuid, action text not null, changed_at timestamptz not null default now(), details jsonb);
CREATE INDEX IF NOT EXISTS idx_audit_log_changed_at ON audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_periods_company_month ON periods(company_id,month);
