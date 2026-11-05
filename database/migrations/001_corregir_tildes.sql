-- Corrige textos UTF-8 interpretados como Windows-1252 (p. ej. RevisiÃ³n).
-- No modifica descripciones que ya estén bien escritas.
-- Ejecutar una sola vez sobre los datos de prueba existentes.
BEGIN;
UPDATE template_activities SET description=convert_from(convert_to(description,'WIN1252'),'UTF8') WHERE description LIKE '%Ã%';
UPDATE activities SET description=convert_from(convert_to(description,'WIN1252'),'UTF8') WHERE description LIKE '%Ã%';
COMMIT;
