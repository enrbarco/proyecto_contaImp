BEGIN;

CREATE OR REPLACE FUNCTION assert_period_is_open(period_id_to_check uuid) RETURNS void LANGUAGE plpgsql AS $$
DECLARE current_status text;
BEGIN
 SELECT p.status INTO current_status FROM periods p WHERE p.id=period_id_to_check FOR UPDATE;
 IF current_status IS DISTINCT FROM 'abierto' THEN RAISE EXCEPTION 'Período cerrado'; END IF;
END $$;

CREATE OR REPLACE FUNCTION assert_open_form() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_form_id uuid; target_period_id uuid; form_ids uuid[];
BEGIN
 IF TG_OP='INSERT' THEN
  form_ids := ARRAY[NEW.form_id];
 ELSIF TG_OP='DELETE' THEN
  form_ids := ARRAY[OLD.form_id];
 ELSE
  form_ids := ARRAY[OLD.form_id,NEW.form_id];
 END IF;
 FOR target_form_id IN
  SELECT DISTINCT form_id FROM UNNEST(form_ids) AS forms_to_lock(form_id) ORDER BY form_id
 LOOP
  PERFORM 1 FROM forms f WHERE f.id=target_form_id FOR UPDATE;
 END LOOP;
 FOR target_period_id IN
  SELECT DISTINCT f.period_id FROM forms f WHERE f.id=ANY(form_ids) ORDER BY f.period_id
  LOOP
  PERFORM assert_period_is_open(target_period_id);
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS block_closed_activities ON activities;
CREATE TRIGGER block_closed_activities BEFORE INSERT OR UPDATE OR DELETE ON activities
 FOR EACH ROW EXECUTE FUNCTION assert_open_form();

CREATE OR REPLACE FUNCTION assert_open_period_on_form() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_period_id uuid; period_ids uuid[];
BEGIN
 IF TG_OP='INSERT' THEN
  period_ids := ARRAY[NEW.period_id];
 ELSIF TG_OP='DELETE' THEN
  period_ids := ARRAY[OLD.period_id];
 ELSE
  period_ids := ARRAY[OLD.period_id,NEW.period_id];
 END IF;
 FOR target_period_id IN
  SELECT DISTINCT p_id FROM UNNEST(period_ids) AS periods_to_check(p_id) ORDER BY p_id
 LOOP
  PERFORM assert_period_is_open(target_period_id);
 END LOOP;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS block_closed_forms ON forms;
CREATE TRIGGER block_closed_forms BEFORE INSERT OR UPDATE OR DELETE ON forms
 FOR EACH ROW EXECUTE FUNCTION assert_open_period_on_form();

COMMIT;
