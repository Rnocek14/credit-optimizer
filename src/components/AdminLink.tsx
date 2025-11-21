import { Link } from 'react-router-dom';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserRole } from '@/hooks/useUserRole';

interface AdminLinkProps {
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
}

export function AdminLink({ variant = 'outline', className }: AdminLinkProps) {
  const { isAdmin, isLoading } = useUserRole();

  if (isLoading || !isAdmin) {
    return null;
  }

  return (
    <Link to="/admin/transfer-rules">
      <Button variant={variant} size="sm" className={className}>
        <Shield className="h-4 w-4 mr-2" />
        Admin
      </Button>
    </Link>
  );
}
