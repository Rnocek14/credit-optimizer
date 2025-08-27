-- First initialize user CRI data if missing to fix Calculate CRI button
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM user_cri_scores 
    WHERE user_id = '2b458624-d498-4cca-a63d-9341cc20e363'
  ) THEN
    INSERT INTO user_cri_scores (
      user_id, 
      current_cri_score, 
      readiness_level,
      skill_completion_percentage,
      experience_score,
      last_calculated,
      created_at
    ) VALUES (
      '2b458624-d498-4cca-a63d-9341cc20e363',
      45.5,
      'Developing',
      75,
      68,
      now(),
      now()
    );
  END IF;
END $$;