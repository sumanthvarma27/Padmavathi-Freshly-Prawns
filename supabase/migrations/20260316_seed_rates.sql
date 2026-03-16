-- ============================================================
-- Seed: Count Ranges, Worker Rates, Company Rates
-- Based on Padmavathi Freshly Farms.xlsx (Sheet3 + Sheet5)
-- Run date: 2026-03-16
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. ENSURE count_ranges has the exact ranges from the sheets
-- ────────────────────────────────────────────────────────────
-- First, deactivate any existing ranges so we start clean
UPDATE public.count_ranges SET is_active = false;

-- Insert sheet count ranges (idempotent via ON CONFLICT DO NOTHING on label)
-- Sheet3 (worker rates) uses: 8-30,31-40,41-50,51-60,61-70,71-90,91-110,111-200
-- Sheet5 (company rates) uses: 13-15,16-20,21-25,26-30,31-40,41-50,51-60,61-70,71-90,91-110,111-200
-- We use the superset. Ranges that only exist in Sheet5 are needed for company rates.

INSERT INTO public.count_ranges (label, min_count, max_count, sort_order, is_active)
VALUES
  ('8-30',    8,   30,   1, true),
  ('13-15',  13,   15,   2, true),
  ('16-20',  16,   20,   3, true),
  ('21-25',  21,   25,   4, true),
  ('26-30',  26,   30,   5, true),
  ('31-40',  31,   40,   6, true),
  ('41-50',  41,   50,   7, true),
  ('51-60',  51,   60,   8, true),
  ('61-70',  61,   70,   9, true),
  ('71-90',  71,   90,  10, true),
  ('91-110', 91,  110,  11, true),
  ('111-200',111, 200,  12, true)
ON CONFLICT (label) DO UPDATE
  SET min_count  = EXCLUDED.min_count,
      max_count  = EXCLUDED.max_count,
      sort_order = EXCLUDED.sort_order,
      is_active  = true;

-- ────────────────────────────────────────────────────────────
-- 2. WORKER RATES  (Sheet3)
-- Deactivate all existing worker rates first, then seed fresh
-- ────────────────────────────────────────────────────────────
UPDATE public.worker_rates SET is_active = false;

DO $$
DECLARE
  v_effective_from timestamptz := '2026-01-01T00:00:00Z';

  -- Processing type IDs (resolved by name)
  pt_pd         uuid;
  pt_easy_peel  uuid;
  pt_tail_on    uuid;
  pt_cooked     uuid;
  pt_tailon_full uuid;
  pt_pd_full    uuid;
  pt_shaving    uuid;

  -- Count range IDs (resolved by label)
  cr_8_30    uuid;
  cr_31_40   uuid;
  cr_41_50   uuid;
  cr_51_60   uuid;
  cr_61_70   uuid;
  cr_71_90   uuid;
  cr_91_110  uuid;
  cr_111_200 uuid;
BEGIN
  -- Resolve processing type UUIDs by name
  SELECT processing_type_id INTO pt_pd         FROM public.processing_types WHERE name ILIKE '%Peeled%Deveined%' OR name ILIKE '%PD%' AND name NOT ILIKE '%Full%' LIMIT 1;
  SELECT processing_type_id INTO pt_easy_peel   FROM public.processing_types WHERE name ILIKE '%Easy%Peel%' LIMIT 1;
  SELECT processing_type_id INTO pt_tail_on     FROM public.processing_types WHERE name ILIKE '%Tail%On%' AND name NOT ILIKE '%Cook%' AND name NOT ILIKE '%Full%' AND name NOT ILIKE '%Shav%' LIMIT 1;
  SELECT processing_type_id INTO pt_cooked      FROM public.processing_types WHERE name ILIKE '%Cooked%Tail%' LIMIT 1;
  SELECT processing_type_id INTO pt_tailon_full FROM public.processing_types WHERE name ILIKE '%Tailon%Full%' OR name ILIKE '%Tail%Full%Cut%' LIMIT 1;
  SELECT processing_type_id INTO pt_pd_full     FROM public.processing_types WHERE name ILIKE '%PD%Full%' LIMIT 1;
  SELECT processing_type_id INTO pt_shaving     FROM public.processing_types WHERE name ILIKE '%Shav%' LIMIT 1;

  -- Resolve count range UUIDs by label
  SELECT count_range_id INTO cr_8_30    FROM public.count_ranges WHERE label = '8-30'    AND is_active = true;
  SELECT count_range_id INTO cr_31_40   FROM public.count_ranges WHERE label = '31-40'   AND is_active = true;
  SELECT count_range_id INTO cr_41_50   FROM public.count_ranges WHERE label = '41-50'   AND is_active = true;
  SELECT count_range_id INTO cr_51_60   FROM public.count_ranges WHERE label = '51-60'   AND is_active = true;
  SELECT count_range_id INTO cr_61_70   FROM public.count_ranges WHERE label = '61-70'   AND is_active = true;
  SELECT count_range_id INTO cr_71_90   FROM public.count_ranges WHERE label = '71-90'   AND is_active = true;
  SELECT count_range_id INTO cr_91_110  FROM public.count_ranges WHERE label = '91-110'  AND is_active = true;
  SELECT count_range_id INTO cr_111_200 FROM public.count_ranges WHERE label = '111-200' AND is_active = true;

  -- ── Peeled & Deveined ──────────────────────────────────────
  IF pt_pd IS NOT NULL THEN
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd, cr_8_30,    8,    v_effective_from, true WHERE cr_8_30    IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd, cr_31_40,   10.5, v_effective_from, true WHERE cr_31_40   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd, cr_41_50,   12,   v_effective_from, true WHERE cr_41_50   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd, cr_51_60,   13,   v_effective_from, true WHERE cr_51_60   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd, cr_61_70,   16,   v_effective_from, true WHERE cr_61_70   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd, cr_71_90,   17,   v_effective_from, true WHERE cr_71_90   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd, cr_91_110,  18,   v_effective_from, true WHERE cr_91_110  IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd, cr_111_200, 18,   v_effective_from, true WHERE cr_111_200 IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;

  -- ── Easy Peel ──────────────────────────────────────────────
  IF pt_easy_peel IS NOT NULL THEN
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_easy_peel, cr_8_30,  7,   v_effective_from, true WHERE cr_8_30  IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_easy_peel, cr_31_40, 7.5, v_effective_from, true WHERE cr_31_40 IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_easy_peel, cr_41_50, 8,   v_effective_from, true WHERE cr_41_50 IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_easy_peel, cr_51_60, 9,   v_effective_from, true WHERE cr_51_60 IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_easy_peel, cr_61_70, 10,  v_effective_from, true WHERE cr_61_70 IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;

  -- ── Tail On ───────────────────────────────────────────────
  IF pt_tail_on IS NOT NULL THEN
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tail_on, cr_8_30,    10,  v_effective_from, true WHERE cr_8_30    IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tail_on, cr_31_40,   12,  v_effective_from, true WHERE cr_31_40   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tail_on, cr_41_50,   13,  v_effective_from, true WHERE cr_41_50   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tail_on, cr_51_60,   16,  v_effective_from, true WHERE cr_51_60   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tail_on, cr_61_70,   17,  v_effective_from, true WHERE cr_61_70   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tail_on, cr_71_90,   18,  v_effective_from, true WHERE cr_71_90   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tail_on, cr_91_110,  18,  v_effective_from, true WHERE cr_91_110  IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;

  -- ── Cooked Tail ON ────────────────────────────────────────
  IF pt_cooked IS NOT NULL THEN
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_cooked, cr_8_30,    8,    v_effective_from, true WHERE cr_8_30    IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_cooked, cr_31_40,   10.5, v_effective_from, true WHERE cr_31_40   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_cooked, cr_41_50,   12,   v_effective_from, true WHERE cr_41_50   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_cooked, cr_51_60,   13,   v_effective_from, true WHERE cr_51_60   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_cooked, cr_61_70,   16,   v_effective_from, true WHERE cr_61_70   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_cooked, cr_71_90,   17,   v_effective_from, true WHERE cr_71_90   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_cooked, cr_91_110,  18,   v_effective_from, true WHERE cr_91_110  IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_cooked, cr_111_200, 18,   v_effective_from, true WHERE cr_111_200 IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;

  -- ── Tailon Full Cut ───────────────────────────────────────
  IF pt_tailon_full IS NOT NULL THEN
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tailon_full, cr_8_30,    8,    v_effective_from, true WHERE cr_8_30    IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tailon_full, cr_31_40,   10.5, v_effective_from, true WHERE cr_31_40   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tailon_full, cr_41_50,   12,   v_effective_from, true WHERE cr_41_50   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tailon_full, cr_51_60,   13,   v_effective_from, true WHERE cr_51_60   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tailon_full, cr_61_70,   16,   v_effective_from, true WHERE cr_61_70   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tailon_full, cr_71_90,   17,   v_effective_from, true WHERE cr_71_90   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tailon_full, cr_91_110,  18,   v_effective_from, true WHERE cr_91_110  IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_tailon_full, cr_111_200, 18,   v_effective_from, true WHERE cr_111_200 IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;

  -- ── PD Full Cut ───────────────────────────────────────────
  IF pt_pd_full IS NOT NULL THEN
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd_full, cr_8_30,    8,    v_effective_from, true WHERE cr_8_30    IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd_full, cr_31_40,   10.5, v_effective_from, true WHERE cr_31_40   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd_full, cr_41_50,   12,   v_effective_from, true WHERE cr_41_50   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd_full, cr_51_60,   13,   v_effective_from, true WHERE cr_51_60   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd_full, cr_61_70,   16,   v_effective_from, true WHERE cr_61_70   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd_full, cr_71_90,   17,   v_effective_from, true WHERE cr_71_90   IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd_full, cr_91_110,  18,   v_effective_from, true WHERE cr_91_110  IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_pd_full, cr_111_200, 18,   v_effective_from, true WHERE cr_111_200 IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;

  -- ── Tailon Shaving ────────────────────────────────────────
  IF pt_shaving IS NOT NULL THEN
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_shaving, cr_8_30,  10, v_effective_from, true WHERE cr_8_30  IS NOT NULL ON CONFLICT DO NOTHING;
    INSERT INTO public.worker_rates (processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
    SELECT pt_shaving, cr_31_40, 10, v_effective_from, true WHERE cr_31_40 IS NOT NULL ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- ────────────────────────────────────────────────────────────
-- 3. COMPANY RATES  (Sheet5)
-- Ensure company_rates has processing_type_id + count_range_id columns
-- ────────────────────────────────────────────────────────────
ALTER TABLE public.company_rates
  ADD COLUMN IF NOT EXISTS processing_type_id uuid REFERENCES public.processing_types(processing_type_id),
  ADD COLUMN IF NOT EXISTS count_range_id      uuid REFERENCES public.count_ranges(count_range_id);

-- Drop the old unique constraint that limits one active rate per company (too strict now)
DROP INDEX IF EXISTS uq_company_rates_open_window;

-- New unique index: one active open-ended rate per company + processing_type + count_range
CREATE UNIQUE INDEX IF NOT EXISTS uq_company_rates_combo_open
  ON public.company_rates(company_id, processing_type_id, count_range_id)
  WHERE is_active = true AND effective_to IS NULL;

-- Deactivate all existing company rates so we can seed fresh
UPDATE public.company_rates SET is_active = false;

DO $$
DECLARE
  v_effective_from timestamptz := '2026-01-01T00:00:00Z';
  v_company        RECORD;

  pt_pd         uuid;
  pt_easy_peel  uuid;
  pt_tail_on    uuid;
  pt_cooked     uuid;
  pt_tailon_full uuid;
  pt_pd_full    uuid;
  pt_shaving    uuid;

  cr_13_15  uuid;
  cr_16_20  uuid;
  cr_21_25  uuid;
  cr_26_30  uuid;
  cr_31_40  uuid;
  cr_41_50  uuid;
  cr_51_60  uuid;
  cr_61_70  uuid;
  cr_71_90  uuid;
  cr_91_110 uuid;
  cr_111_200 uuid;

  -- rate map: processing type → array of (count_range_id, rate)
  v_rates jsonb;
BEGIN
  SELECT processing_type_id INTO pt_pd         FROM public.processing_types WHERE name ILIKE '%Peeled%Deveined%' OR (name ILIKE '%PD%' AND name NOT ILIKE '%Full%') LIMIT 1;
  SELECT processing_type_id INTO pt_easy_peel   FROM public.processing_types WHERE name ILIKE '%Easy%Peel%' LIMIT 1;
  SELECT processing_type_id INTO pt_tail_on     FROM public.processing_types WHERE name ILIKE '%Tail%On%' AND name NOT ILIKE '%Cook%' AND name NOT ILIKE '%Full%' AND name NOT ILIKE '%Shav%' LIMIT 1;
  SELECT processing_type_id INTO pt_cooked      FROM public.processing_types WHERE name ILIKE '%Cooked%Tail%' LIMIT 1;
  SELECT processing_type_id INTO pt_tailon_full FROM public.processing_types WHERE name ILIKE '%Tailon%Full%' OR name ILIKE '%Tail%Full%Cut%' LIMIT 1;
  SELECT processing_type_id INTO pt_pd_full     FROM public.processing_types WHERE name ILIKE '%PD%Full%' LIMIT 1;
  SELECT processing_type_id INTO pt_shaving     FROM public.processing_types WHERE name ILIKE '%Shav%' LIMIT 1;

  SELECT count_range_id INTO cr_13_15  FROM public.count_ranges WHERE label = '13-15'  AND is_active = true;
  SELECT count_range_id INTO cr_16_20  FROM public.count_ranges WHERE label = '16-20'  AND is_active = true;
  SELECT count_range_id INTO cr_21_25  FROM public.count_ranges WHERE label = '21-25'  AND is_active = true;
  SELECT count_range_id INTO cr_26_30  FROM public.count_ranges WHERE label = '26-30'  AND is_active = true;
  SELECT count_range_id INTO cr_31_40  FROM public.count_ranges WHERE label = '31-40'  AND is_active = true;
  SELECT count_range_id INTO cr_41_50  FROM public.count_ranges WHERE label = '41-50'  AND is_active = true;
  SELECT count_range_id INTO cr_51_60  FROM public.count_ranges WHERE label = '51-60'  AND is_active = true;
  SELECT count_range_id INTO cr_61_70  FROM public.count_ranges WHERE label = '61-70'  AND is_active = true;
  SELECT count_range_id INTO cr_71_90  FROM public.count_ranges WHERE label = '71-90'  AND is_active = true;
  SELECT count_range_id INTO cr_91_110 FROM public.count_ranges WHERE label = '91-110' AND is_active = true;
  SELECT count_range_id INTO cr_111_200 FROM public.count_ranges WHERE label = '111-200' AND is_active = true;

  FOR v_company IN (SELECT company_id FROM public.companies WHERE is_active = true) LOOP

    -- ── Most types share the same rate ladder: 13,13,13,13,14,16,18,20,20,23,23
    FOR v_pt IN SELECT unnest(ARRAY[pt_pd, pt_easy_peel, pt_tail_on, pt_cooked, pt_tailon_full, pt_pd_full]) AS pt_id LOOP
      IF v_pt.pt_id IS NOT NULL THEN
        INSERT INTO public.company_rates(company_id, processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
        VALUES
          (v_company.company_id, v_pt.pt_id, cr_13_15,   13, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_16_20,   13, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_21_25,   13, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_26_30,   13, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_31_40,   14, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_41_50,   16, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_51_60,   18, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_61_70,   20, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_71_90,   20, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_91_110,  23, v_effective_from, true),
          (v_company.company_id, v_pt.pt_id, cr_111_200, 23, v_effective_from, true)
        ON CONFLICT DO NOTHING;
      END IF;
    END LOOP;

    -- ── Tailon Shaving: only 31-40 range at rate 15
    IF pt_shaving IS NOT NULL AND cr_31_40 IS NOT NULL THEN
      INSERT INTO public.company_rates(company_id, processing_type_id, count_range_id, rate_per_kg, effective_from, is_active)
      VALUES (v_company.company_id, pt_shaving, cr_31_40, 15, v_effective_from, true)
      ON CONFLICT DO NOTHING;
    END IF;

  END LOOP;
END $$;
