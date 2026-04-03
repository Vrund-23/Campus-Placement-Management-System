import { Check, Clock, User, UserCheck, Shield } from 'lucide-react';
import { VerificationStage } from '@/types';
import { cn } from '@/lib/utils';

interface VerificationStepperProps {
  currentStage: VerificationStage;
  isTpcVerified: boolean;
  isTpoVerified: boolean;
}

interface Step {
  id: VerificationStage;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: Step[] = [
  { id: 'pending', label: 'Submitted', description: 'Profile submitted', icon: User },
  { id: 'tpc_verified', label: 'TPC Review', description: 'Coordinator verification', icon: UserCheck },
  { id: 'tpo_verified', label: 'TPO Final', description: 'Final verification', icon: Shield },
];

export function VerificationStepper({
  currentStage,
  isTpcVerified,
  isTpoVerified,
}: VerificationStepperProps) {
  const getStepStatus = (stepId: VerificationStage) => {
    switch (stepId) {
      case 'pending':
        return 'completed';
      case 'tpc_verified':
        return isTpcVerified ? 'completed' : 'current';
      case 'tpo_verified':
        return isTpoVerified ? 'completed' : (isTpcVerified ? 'current' : 'upcoming');
      default:
        return 'upcoming';
    }
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const StepIcon = step.icon;

          return (
            <div key={step.id} className="flex flex-1 items-center">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all",
                    status === 'completed' && "border-primary bg-primary text-primary-foreground",
                    status === 'current' && "border-primary bg-background text-primary",
                    status === 'upcoming' && "border-muted bg-muted text-muted-foreground"
                  )}
                >
                  {status === 'completed' ? (
                    <Check className="h-5 w-5" />
                  ) : status === 'current' ? (
                    <Clock className="h-5 w-5 animate-pulse" />
                  ) : (
                    <StepIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="mt-2 text-center">
                  <p
                    className={cn(
                      "text-sm font-medium",
                      status === 'completed' && "text-primary",
                      status === 'current' && "text-foreground",
                      status === 'upcoming' && "text-muted-foreground"
                    )}
                  >
                    {step.label}
                  </p>
                  <p className="text-xs text-muted-foreground hidden sm:block">
                    {step.description}
                  </p>
                </div>
              </div>

              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "mx-2 h-0.5 flex-1",
                    getStepStatus(steps[index + 1].id) === 'completed' ||
                      getStepStatus(steps[index + 1].id) === 'current'
                      ? "bg-primary"
                      : "bg-muted"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
