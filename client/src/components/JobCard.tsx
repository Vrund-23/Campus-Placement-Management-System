import { Briefcase, MapPin, Calendar, Users, IndianRupee, AlertCircle } from 'lucide-react';
import { Job, StudentProfile } from '@/types';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface JobCardProps {
  job: Job;
  studentProfile?: StudentProfile;
  onApply?: (jobId: string) => void;
  hasApplied?: boolean;
  showApplyButton?: boolean;
}

export function JobCard({
  job,
  studentProfile,
  onApply,
  hasApplied = false,
  showApplyButton = true
}: JobCardProps) {
  const checkEligibility = (): { eligible: boolean; reason?: string } => {
    if (!studentProfile) return { eligible: true };

    if (studentProfile.isPlaced) {
      return { eligible: false, reason: 'Already placed' };
    }
    if (studentProfile.cgpa < job.minCgpa) {
      return { eligible: false, reason: `Min CGPA ${job.minCgpa} Required` };
    }
    if (studentProfile.backlogs > job.maxBacklogs) {
      return { eligible: false, reason: `Max ${job.maxBacklogs} Backlogs Allowed` };
    }
    if (job.min10thPercent && job.min10thPercent > 0 && studentProfile.class_10_percentage && studentProfile.class_10_percentage < job.min10thPercent) {
      return { eligible: false, reason: `Min 10th ${job.min10thPercent}% Required` };
    }
    if (job.min12thPercent && job.min12thPercent > 0) {
      const max12thOrDiploma = Math.max(studentProfile.class_12_percentage || 0, studentProfile.diploma_percentage || 0);
      if (max12thOrDiploma < job.min12thPercent) {
        return { eligible: false, reason: `Min 12th/Diploma ${job.min12thPercent}% Required` };
      }
    }
    if (!job.eligibleBranches.includes('All') && !job.eligibleBranches.includes(studentProfile.department)) {
      return { eligible: false, reason: 'Branch not eligible' };
    }
    if (!studentProfile.isTpoVerified) {
      return { eligible: false, reason: 'Profile not verified' };
    }
    return { eligible: true };
  };

  const { eligible, reason } = checkEligibility();
  const isDeadlinePassed = new Date(job.deadline) < new Date();

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      !eligible && "opacity-75"
    )}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            {job.companyLogo ? (
              <img
                src={job.companyLogo}
                alt={job.company}
                className="h-12 w-12 rounded-lg border border-border object-contain bg-card p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Briefcase className="h-6 w-6" />
              </div>
            )}
            <div>
              <h3 className="font-semibold text-foreground">{job.title}</h3>
              <p className="text-sm text-muted-foreground">{job.company}</p>
            </div>
          </div>
          <Badge variant={job.isActive ? "default" : "secondary"}>
            {job.isActive ? 'Active' : 'Closed'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground line-clamp-2">{job.description}</p>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-foreground">
            <IndianRupee className="h-4 w-4 text-primary" />
            <span className="font-medium">{job.ctc}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{job.location}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4" />
            <span>Deadline: {new Date(job.deadline).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{job.applicationsCount} Applied</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="text-xs">
            Min CGPA: {job.minCgpa}
          </Badge>
          <Badge variant="outline" className="text-xs">
            Max Backlogs: {job.maxBacklogs}
          </Badge>
          {job.min10thPercent ? (
            <Badge variant="outline" className="text-xs bg-muted/30">
              Min 10th: {job.min10thPercent}%
            </Badge>
          ) : null}
          {job.min12thPercent ? (
            <Badge variant="outline" className="text-xs bg-muted/30">
              Min 12th: {job.min12thPercent}%
            </Badge>
          ) : null}
          <Badge variant="secondary" className="text-xs">
            {job.eligibleBranches.includes('All') ? 'All Branches' : job.eligibleBranches.join(', ')}
          </Badge>
        </div>

        {!eligible && reason && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{reason}</span>
          </div>
        )}
      </CardContent>

      {showApplyButton && (
        <CardFooter>
          <Button
            className="w-full"
            disabled={!eligible || hasApplied || isDeadlinePassed}
            onClick={() => eligible && onApply?.(job.id)}
          >
            {hasApplied ? 'Applied' : isDeadlinePassed ? 'Deadline Passed' : eligible ? 'Apply Now' : 'Not Eligible'}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
