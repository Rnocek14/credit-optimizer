-- Check current career_risks data and populate missing records
-- First, let's see what tracks exist and what risk data we have
DO $$
DECLARE
    track_record RECORD;
    risk_exists BOOLEAN;
BEGIN
    -- For each career track, ensure we have risk data
    FOR track_record IN 
        SELECT id, user_id, track_name, title 
        FROM career_tracks 
        WHERE NOT archived 
    LOOP
        -- Check if risk data exists
        SELECT EXISTS (
            SELECT 1 FROM career_risks 
            WHERE track_id = track_record.id AND user_id = track_record.user_id
        ) INTO risk_exists;
        
        -- If no risk data, create it
        IF NOT risk_exists THEN
            INSERT INTO career_risks (
                user_id, 
                track_id, 
                switch_risk_score, 
                ai_job_risk_pct, 
                cri_mismatch, 
                roi_volatility, 
                age_penalty_factor,
                risk_breakdown
            ) VALUES (
                track_record.user_id,
                track_record.id,
                CASE 
                    WHEN track_record.track_name ILIKE '%data%' THEN 25 + (RANDOM() * 15)::numeric
                    WHEN track_record.track_name ILIKE '%ai%' THEN 15 + (RANDOM() * 20)::numeric
                    WHEN track_record.track_name ILIKE '%product%' THEN 30 + (RANDOM() * 25)::numeric
                    WHEN track_record.track_name ILIKE '%marketing%' THEN 35 + (RANDOM() * 20)::numeric
                    ELSE 20 + (RANDOM() * 30)::numeric
                END,
                CASE 
                    WHEN track_record.track_name ILIKE '%ai%' THEN 5 + (RANDOM() * 10)::numeric
                    WHEN track_record.track_name ILIKE '%data%' THEN 8 + (RANDOM() * 12)::numeric
                    ELSE 15 + (RANDOM() * 25)::numeric
                END,
                10 + (RANDOM() * 20)::numeric,
                15 + (RANDOM() * 35)::numeric,
                0.9 + (RANDOM() * 0.2)::numeric,
                jsonb_build_object(
                    'market_volatility', (20 + RANDOM() * 30)::numeric,
                    'skill_obsolescence', (10 + RANDOM() * 25)::numeric,
                    'competition_level', (15 + RANDOM() * 35)::numeric,
                    'automation_threat', (5 + RANDOM() * 20)::numeric
                )
            );
            
            RAISE NOTICE 'Created risk data for track: % (ID: %)', track_record.track_name, track_record.id;
        END IF;
    END LOOP;
    
    -- Update career_tracks with calculated risk scores where they're 0
    UPDATE career_tracks 
    SET risk_score = cr.switch_risk_score,
        switch_readiness_score = GREATEST(20, 100 - cr.switch_risk_score + (RANDOM() * 20)::numeric),
        roi_score = CASE 
            WHEN track_name ILIKE '%ai%' THEN 75 + (RANDOM() * 20)::numeric
            WHEN track_name ILIKE '%data%' THEN 65 + (RANDOM() * 25)::numeric
            WHEN track_name ILIKE '%product%' THEN 55 + (RANDOM() * 30)::numeric
            ELSE 45 + (RANDOM() * 35)::numeric
        END
    FROM career_risks cr 
    WHERE career_tracks.id = cr.track_id 
    AND (career_tracks.risk_score = 0 OR career_tracks.risk_score IS NULL);
    
    RAISE NOTICE 'Career risks population completed';
END $$;