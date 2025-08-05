-- Add validated_at column to mentor_course_curations table
ALTER TABLE mentor_course_curations
ADD COLUMN validated_at TIMESTAMP WITH TIME ZONE DEFAULT now();