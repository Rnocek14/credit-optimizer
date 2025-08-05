-- Clean up orphaned records in course_intelligence_pipeline
DELETE FROM course_intelligence_pipeline 
WHERE course_id NOT IN (
  SELECT id FROM course_discovery_queue
);

-- Add foreign key constraint with CASCADE DELETE to prevent future orphaned records
ALTER TABLE course_intelligence_pipeline 
ADD CONSTRAINT fk_course_intelligence_pipeline_course_id 
FOREIGN KEY (course_id) REFERENCES course_discovery_queue(id) 
ON DELETE CASCADE;