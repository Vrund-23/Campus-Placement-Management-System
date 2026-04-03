import { ApplicationStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { Clock, CheckCircle, XCircle, Award } from 'lucide-react';

interface ApplicationStatusBadgeProps {
  status: ApplicationStatus;
  showIcon?: boolean;
  className?: string;
}

const statusConfig: Record<ApplicationStatus, {
  label: string;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  applied: {
    label: 'Applied',
    variant: 'secondary',
    icon: Clock,
    className: 'bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400 border-blue-200 dark:border-blue-900',
  },
  shortlisted: {
    label: 'Shortlisted',
    variant: 'default',
    icon: CheckCircle,
    className: 'bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400 border-green-200 dark:border-green-900',
  },
  placed: {
    label: 'Placed',
    variant: 'default',
    icon: Award,
    className: 'bg-primary text-primary-foreground',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    icon: XCircle,
    className: 'bg-destructive/10 text-destructive border-destructive/20',
  },
};

export function ApplicationStatusBadge({ status, showIcon = true, className }: ApplicationStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn("gap-1.5", config.className, className)}
    >
      {showIcon && <Icon className="h-3.5 w-3.5" />}
      {config.label}
    </Badge>
  );
}
