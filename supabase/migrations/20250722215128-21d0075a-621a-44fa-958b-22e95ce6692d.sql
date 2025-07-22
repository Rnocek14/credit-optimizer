-- Insert Data Analyst career path and all its steps
DO $$
DECLARE
    data_analyst_id UUID;
BEGIN
    -- Check if Data Analyst career path already exists
    SELECT id INTO data_analyst_id FROM public.career_paths WHERE title = 'Data Analyst' LIMIT 1;
    
    -- If not found, create it
    IF data_analyst_id IS NULL THEN
        INSERT INTO public.career_paths (title, summary, industry, level, average_salary, growth_outlook)
        VALUES (
          'Data Analyst',
          'Analyze data to help businesses make better decisions through statistical analysis, data visualization, and reporting.',
          'Technology',
          'Entry to Mid-Level',
          75000,
          'Strong growth (15-20% annually)'
        )
        RETURNING id INTO data_analyst_id;
    END IF;

    -- Insert all 12 career steps for Data Analyst path
    INSERT INTO public.career_steps (career_path_id, step_order, title, description, step_type, estimated_time, estimated_cost, proof_method, substitutions, is_terminal) VALUES
    (data_analyst_id, 1, 'Statistics Foundations', 'Learn fundamental statistical concepts including descriptive statistics, probability, and hypothesis testing. Essential foundation for all data analysis work.', 'education', '6 weeks', 'Free', 'certificate', ARRAY['Khan Academy Statistics', 'Coursera Statistics Course', 'edX MIT Introduction to Probability'], false),
    (data_analyst_id, 2, 'Excel Mastery', 'Master advanced Excel functions, pivot tables, and data visualization. Critical tool for most entry-level analyst positions.', 'skill', '4 weeks', '$49', 'certificate', ARRAY['Google Sheets proficiency', 'Microsoft Excel Specialist certification'], false),
    (data_analyst_id, 3, 'SQL Fundamentals', 'Learn to query databases using SQL including joins, aggregations, and subqueries. Essential skill for accessing and manipulating data.', 'skill', '8 weeks', 'Free', 'certificate', ARRAY['PostgreSQL course', 'MySQL certification', 'SQLite practice'], false),
    (data_analyst_id, 4, 'Python for Data Analysis', 'Learn Python programming with focus on pandas, numpy, and matplotlib for data manipulation and visualization.', 'skill', '10 weeks', '$199', 'certificate', ARRAY['R programming', 'Jupyter notebooks portfolio', 'DataCamp Python track'], false),
    (data_analyst_id, 5, 'Data Cleaning Project', 'Complete a comprehensive data cleaning project using real-world messy dataset. Demonstrate ability to handle missing data, outliers, and inconsistencies.', 'project', '3 weeks', 'Free', 'project', ARRAY['Kaggle Learn Data Cleaning course', 'OpenRefine project'], false),
    (data_analyst_id, 6, 'Tableau Visualization', 'Master Tableau for creating interactive dashboards and data visualizations. Learn best practices for visual storytelling with data.', 'skill', '6 weeks', '$79', 'certificate', ARRAY['Power BI certification', 'Google Data Studio', 'D3.js portfolio'], false),
    (data_analyst_id, 7, 'Business Analytics Project', 'Complete end-to-end business analysis project including problem definition, data collection, analysis, and presentation of actionable insights.', 'project', '4 weeks', 'Free', 'project', ARRAY['Consulting case study', 'Internship project'], false),
    (data_analyst_id, 8, 'Google Analytics Certification', 'Earn Google Analytics certification to demonstrate web analytics expertise. Valuable for digital marketing and e-commerce analysis roles.', 'certification', '2 weeks', 'Free', 'certificate', ARRAY['Adobe Analytics certification', 'Mixpanel expertise'], false),
    (data_analyst_id, 9, 'Portfolio Development', 'Create professional portfolio showcasing 3-5 data analysis projects with clear documentation and business impact. Include GitHub repository and personal website.', 'portfolio', '3 weeks', '$15', 'portfolio', ARRAY['LinkedIn portfolio', 'Kaggle profile', 'Medium articles'], false),
    (data_analyst_id, 10, 'Advanced SQL & Database Design', 'Learn advanced SQL concepts including window functions, CTEs, and basic database design principles for complex analytical queries.', 'skill', '4 weeks', '$129', 'certificate', ARRAY['Oracle SQL certification', 'dbt certification'], false),
    (data_analyst_id, 11, 'A/B Testing Project', 'Design and analyze an A/B test including experimental design, statistical power calculation, and interpretation of results with business recommendations.', 'project', '3 weeks', 'Free', 'project', ARRAY['Optimizely certification', 'Statistical consulting project'], false),
    (data_analyst_id, 12, 'Junior Data Analyst Position', 'Secure entry-level data analyst role applying learned skills in real business environment. Focus on companies that value growth and mentorship.', 'job', '2 months', 'Free', 'resume', ARRAY['Data analyst internship', 'Freelance analytics projects'], true);

    -- Update terminal step with job titles
    UPDATE public.career_steps 
    SET linked_job_titles = ARRAY['Junior Data Analyst', 'Business Analyst I', 'Marketing Analyst', 'Operations Analyst']
    WHERE career_path_id = data_analyst_id AND step_order = 12;

    -- Add prerequisites
    UPDATE public.career_steps 
    SET prerequisites = ARRAY['Statistics Foundations']
    WHERE career_path_id = data_analyst_id AND title = 'Python for Data Analysis';

    UPDATE public.career_steps 
    SET prerequisites = ARRAY['Python for Data Analysis', 'SQL Fundamentals']
    WHERE career_path_id = data_analyst_id AND title = 'Data Cleaning Project';

    UPDATE public.career_steps 
    SET prerequisites = ARRAY['Data Cleaning Project', 'Tableau Visualization', 'Statistics Foundations']
    WHERE career_path_id = data_analyst_id AND title = 'Business Analytics Project';

    UPDATE public.career_steps 
    SET prerequisites = ARRAY['Business Analytics Project', 'Data Cleaning Project']
    WHERE career_path_id = data_analyst_id AND title = 'Portfolio Development';

    UPDATE public.career_steps 
    SET prerequisites = ARRAY['SQL Fundamentals', 'Python for Data Analysis']
    WHERE career_path_id = data_analyst_id AND title = 'Advanced SQL & Database Design';

    UPDATE public.career_steps 
    SET prerequisites = ARRAY['Statistics Foundations', 'Business Analytics Project']
    WHERE career_path_id = data_analyst_id AND title = 'A/B Testing Project';

    UPDATE public.career_steps 
    SET prerequisites = ARRAY['Portfolio Development', 'Advanced SQL & Database Design', 'A/B Testing Project', 'Google Analytics Certification']
    WHERE career_path_id = data_analyst_id AND title = 'Junior Data Analyst Position';

END $$;