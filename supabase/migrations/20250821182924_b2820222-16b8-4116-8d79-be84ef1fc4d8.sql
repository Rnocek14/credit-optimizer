-- Fix ownership of tracks - assign all tracks to Aisha for demo consistency
UPDATE career_tracks 
SET user_id = '2b458624-d498-4cca-a63d-9341cc20e363' 
WHERE user_id <> '2b458624-d498-4cca-a63d-9341cc20e363';