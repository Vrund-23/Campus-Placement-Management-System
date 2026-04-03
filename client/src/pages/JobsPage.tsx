import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { JobCard } from '@/components/JobCard';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Briefcase, Loader2 } from 'lucide-react';

interface Job {
  job_id: number;
  company_id: number;
  title: string;
  min_cgpa: number;
  min_10th_percent: number;
  min_12th_percent: number;
  max_backlogs: number;
  eligible_branches: string[];
  deadline: string;
  status: string;
  company_name: string;
  website: string;
  is_blacklisted: boolean;
  applications_count: number;
  is_public: boolean;
}

interface StudentProfile {
  student_id: number;
  enrollment_no: string;
  cgpa: number;
  class_10_percentage?: number;
  class_12_percentage?: number;
  diploma_percentage?: number;
  active_backlogs: number;
  department_name: string;
  is_verified: boolean;
  is_placed: boolean;
}

interface Application {
  app_id: number;
  job_id: number;
  status: string;
}

export default function JobsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [jobs, setJobs] = useState<Job[]>([]);
  const [studentProfile, setStudentProfile] = useState<StudentProfile | null>(null);
  const [appliedJobIds, setAppliedJobIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch jobs, profile, and applications in parallel
      const [jobsData, profileData, applicationsData] = await Promise.all([
        api.get('/jobs'),
        api.get('/students/me').catch(() => null),
        api.get('/applications/me').catch(() => [])
      ]);

      setJobs(Array.isArray(jobsData) ? jobsData : []);
      setStudentProfile(profileData);

      // Extract job IDs from applications
      const appliedIds = Array.isArray(applicationsData)
        ? applicationsData.map((app: Application) => app.job_id)
        : [];
      setAppliedJobIds(appliedIds);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load jobs. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    // Only show OPEN jobs
    if (job.status !== 'OPEN') return false;

    // Don't show blacklisted companies
    if (job.is_blacklisted) return false;

    // Search filter
    const matchesSearch =
      job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company_name.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesSearch;
  });

  const handleApply = async (jobId: number) => {
    try {
      // Check if student is verified
      if (!studentProfile?.is_verified) {
        toast({
          title: 'Verification Required',
          description: 'Your profile must be verified before applying to jobs.',
          variant: 'destructive',
        });
        return;
      }

      // Check if student is already placed
      if (studentProfile?.is_placed) {
        toast({
          title: 'Already Placed',
          description: 'You cannot apply to jobs after being placed.',
          variant: 'destructive',
        });
        return;
      }

      // Check CGPA eligibility
      const job = jobs.find(j => j.job_id === jobId);
      if (job && studentProfile) {
        if (studentProfile.cgpa < job.min_cgpa) {
          toast({
            title: 'Not Eligible',
            description: `Minimum CGPA required: ${job.min_cgpa}. Your CGPA: ${studentProfile.cgpa}`,
            variant: 'destructive',
          });
          return;
        }

        // Check 10th percentage if required
        if (job.min_10th_percent > 0 && studentProfile.class_10_percentage && studentProfile.class_10_percentage < job.min_10th_percent) {
          toast({
            title: 'Not Eligible',
            description: `Minimum 10th percentage required: ${job.min_10th_percent}%. Yours: ${studentProfile.class_10_percentage}%`,
            variant: 'destructive',
          });
          return;
        }

        // Check 12th/Diploma percentage if required
        if (job.min_12th_percent > 0) {
          const max12thOrDiploma = Math.max(studentProfile.class_12_percentage || 0, studentProfile.diploma_percentage || 0);
          if (max12thOrDiploma < job.min_12th_percent) {
            toast({
              title: 'Not Eligible',
              description: `Minimum 12th/Diploma percentage required: ${job.min_12th_percent}%. Yours is lower.`,
              variant: 'destructive',
            });
            return;
          }
        }
        if (studentProfile.active_backlogs > job.max_backlogs) {
          toast({
            title: 'Not Eligible',
            description: `Max backlogs allowed: ${job.max_backlogs}. You have: ${studentProfile.active_backlogs}`,
            variant: 'destructive',
          });
          return;
        }
        // Check branch eligibility
        if (!job.eligible_branches.includes('All') && !job.eligible_branches.includes(studentProfile.department_name)) {
          toast({
            title: 'Not Eligible',
            description: `This job is for ${job.eligible_branches.join(', ')}. You are from ${studentProfile.department_name}.`,
            variant: 'destructive',
          });
          return;
        }
      }

      // Submit application
      await api.post('/applications', { job_id: jobId });

      // Update local state
      setAppliedJobIds([...appliedJobIds, jobId]);

      toast({
        title: 'Application Submitted!',
        description: `You have successfully applied to ${job?.title} at ${job?.company_name}`,
      });
    } catch (error: any) {
      console.error('Error applying to job:', error);
      toast({
        title: 'Application Failed',
        description: error.message || 'Failed to submit application. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Job Listings</h1>
          <p className="text-muted-foreground">Browse and apply to available positions</p>
        </div>

        {/* Profile Status Alert */}
        {studentProfile && !studentProfile.is_verified && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
            <div className="flex items-start gap-3">
              <div className="text-amber-600 dark:text-amber-400">
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-amber-900 dark:text-amber-100">Profile Not Verified</h3>
                <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                  Your profile needs to be verified by placement coordinators before you can apply to jobs.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search jobs or companies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-background"
            />
          </div>
        </div>

        {/* Results count */}
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Briefcase className="h-3.5 w-3.5" />
            {filteredJobs.length} jobs found
          </Badge>
          {searchQuery && (
            <Badge variant="outline">
              Searching: "{searchQuery}"
            </Badge>
          )}
        </div>

        {/* Job Cards Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map((job) => (
            <JobCard
              key={job.job_id}
              job={{
                id: job.job_id.toString(),
                title: job.title,
                company: job.company_name,
                location: 'India', // Default location
                ctc: `${job.min_cgpa} CGPA`, // Show CGPA requirement
                description: '',
                deadline: job.deadline,
                eligibleBranches: job.eligible_branches || ['All'],
                minCgpa: job.min_cgpa,
                min10thPercent: job.min_10th_percent || 0,
                min12thPercent: job.min_12th_percent || 0,
                maxBacklogs: job.max_backlogs || 0,
                applicationsCount: job.applications_count || 0,
                isActive: job.status === 'OPEN',
                isPublic: job.is_public
              }}
              studentProfile={studentProfile ? {
                id: studentProfile.student_id.toString(),
                userId: '',
                name: '',
                email: '',
                department: studentProfile.department_name,
                cgpa: studentProfile.cgpa,
                backlogs: studentProfile.active_backlogs,
                isTpcVerified: studentProfile.is_verified,
                isTpoVerified: studentProfile.is_verified,
                isPlaced: studentProfile.is_placed,
                verificationStage: studentProfile.is_verified ? 'tpo_verified' : 'pending',
                class_10_percentage: studentProfile.class_10_percentage,
                class_12_percentage: studentProfile.class_12_percentage,
                diploma_percentage: studentProfile.diploma_percentage
              } : undefined}
              hasApplied={appliedJobIds.includes(job.job_id)}
              onApply={() => handleApply(job.job_id)}
            />
          ))}
        </div>

        {filteredJobs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No jobs found</h3>
            <p className="text-muted-foreground">
              {searchQuery ? 'Try adjusting your search' : 'No active job postings available'}
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
