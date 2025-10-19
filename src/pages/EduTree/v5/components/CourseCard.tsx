interface CourseCardProps {
  courseId: string;
  title: string;
  credits: number;
  subject: string;
  onClick?: () => void;
}

export function CourseCard({ courseId, title, credits, subject, onClick }: CourseCardProps) {
  return (
    <div
      onClick={(e) => {
        console.log('[CourseCard] Clicked:', { courseId, title });
        e.stopPropagation();
        onClick?.();
      }}
      className="
        course-card
        px-4 py-3 rounded-md border
        bg-card text-card-foreground
        cursor-pointer
        transition-all duration-200
        hover:bg-accent hover:scale-102
        flex items-center justify-between gap-3
      "
    >
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{title}</h4>
        <p className="text-xs text-muted-foreground mt-0.5">{subject}</p>
      </div>
      <div className="flex-shrink-0 text-xs font-semibold text-muted-foreground">
        {credits} credits
      </div>
    </div>
  );
}
