import { ChevronDown, ChevronRight } from 'lucide-react';
import { CourseCard } from './CourseCard';

interface Course {
  courseId: string;
  title: string;
  credits: number;
  subject: string;
}

interface YearCardProps {
  year: number;
  isCollapsed: boolean;
  onToggle: () => void;
  courses?: Course[];
  onCourseClick?: (courseId: string) => void;
}

export function YearCard({ year, isCollapsed, onToggle, courses = [], onCourseClick }: YearCardProps) {
  console.log(`[YearCard] Rendering Year ${year}:`, { isCollapsed });
  
  return (
    <div
      onClick={(e) => {
        console.log('[YearCard] Click event:', { year, isCollapsed });
        e.stopPropagation();
        onToggle();
      }}
      className={`
        year-card
        px-6 py-4 rounded-lg border-2 cursor-pointer
        transition-all duration-200
        min-w-[200px] min-h-[100px]
        flex flex-col justify-center gap-2
        hover:scale-105
        ${isCollapsed 
          ? 'bg-primary/5 border-primary border-dashed opacity-70' 
          : 'bg-primary/10 border-primary'
        }
      `}
    >
      <div className="flex items-center justify-center gap-2 text-primary font-bold text-lg">
        <span>Year {year}</span>
        {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
      </div>
      
      {!isCollapsed && courses.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          {courses.reduce((sum, c) => sum + c.credits, 0)} credits
        </div>
      )}
      
      {!isCollapsed && courses.length > 0 && (
        <div className="courses-container mt-4 space-y-2" onClick={e => e.stopPropagation()}>
          {courses.map(course => (
            <CourseCard
              key={course.courseId}
              courseId={course.courseId}
              title={course.title}
              credits={course.credits}
              subject={course.subject}
              onClick={() => onCourseClick?.(course.courseId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
