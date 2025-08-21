-- Fix ownership for specific tracks that are commonly used, avoiding duplicates
UPDATE career_tracks 
SET user_id = '2b458624-d498-4cca-a63d-9341cc20e363' 
WHERE id IN (
  'ddcc63a7-f933-459d-88c0-53a2df005ef4',  -- UX Design Lead
  '34598f2d-2b73-491b-9846-ce262c1fa14a'   -- Product Designer
) AND user_id <> '2b458624-d498-4cca-a63d-9341cc20e363';