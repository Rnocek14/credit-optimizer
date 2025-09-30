-- Update the refresh function to work directly with requirement_blocks slugs
CREATE OR REPLACE FUNCTION public.refresh_requirement_option_counts()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Clear existing data
  DELETE FROM public.requirement_option_counts_by_block;
  
  -- Aggregate course counts per block using requirement_blocks slugs
  -- Generate both year-prefixed and plain slug variants
  WITH block_mappings AS (
    SELECT 
      rb.id as block_uuid,
      LOWER(rb.slug) as slug_only,
      CASE 
        WHEN rb.level_year IS NOT NULL THEN LOWER(CONCAT('y', rb.level_year, '-', rb.slug))
        ELSE NULL
      END as year_slug
    FROM public.requirement_blocks rb
    WHERE rb.slug IS NOT NULL
  ),
  block_counts AS (
    SELECT 
      bm.block_id,
      COUNT(DISTINCT bm.course_id)::INTEGER as options_count,
      COALESCE(
        bool_or(EXISTS(
          SELECT 1 FROM public.alt_credit_options aco 
          WHERE aco.course_id = bm.course_id 
          AND aco.provider = 'ACE'
        )),
        false
      ) as has_ace_credit,
      COALESCE(
        bool_or(EXISTS(
          SELECT 1 FROM public.alt_credit_options aco 
          WHERE aco.course_id = bm.course_id 
          AND aco.provider = 'CLEP'
        )),
        false
      ) as has_clep
    FROM public.block_members bm
    GROUP BY bm.block_id
  )
  -- Insert rows using slug-only keys
  INSERT INTO public.requirement_option_counts_by_block (block_id, options_count, has_ace_credit, has_clep, updated_at)
  SELECT 
    bmap.slug_only as block_id,
    bc.options_count,
    bc.has_ace_credit,
    bc.has_clep,
    now() as updated_at
  FROM block_mappings bmap
  INNER JOIN block_counts bc ON bc.block_id = bmap.block_uuid
  WHERE bmap.slug_only IS NOT NULL
  
  UNION ALL
  
  -- Insert rows using year-prefixed slug keys
  SELECT 
    bmap.year_slug as block_id,
    bc.options_count,
    bc.has_ace_credit,
    bc.has_clep,
    now() as updated_at
  FROM block_mappings bmap
  INNER JOIN block_counts bc ON bc.block_id = bmap.block_uuid
  WHERE bmap.year_slug IS NOT NULL;
  
  -- Log the refresh
  RAISE NOTICE 'Refreshed % requirement option counts', (SELECT COUNT(*) FROM public.requirement_option_counts_by_block);
END;
$function$;

-- Populate the table
SELECT refresh_requirement_option_counts();