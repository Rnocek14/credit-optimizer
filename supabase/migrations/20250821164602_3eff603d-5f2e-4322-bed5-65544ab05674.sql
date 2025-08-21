-- Fix track ownership: assign the Product Designer track to Aisha so the Compare Tracks works
UPDATE career_tracks 
SET user_id = '2b458624-d498-4cca-a63d-9341cc20e363'
WHERE id = 'e728ea1b-aeac-431a-b223-4315a7044fa5' AND title = 'Product Designer';