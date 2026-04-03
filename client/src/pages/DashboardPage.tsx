import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePlacementStats } from '@/contexts/PlacementStatsContext';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCard } from '@/components/StatsCard';
import { PlacementChart } from '@/components/PlacementChart';
import { VerificationStepper } from '@/components/VerificationStepper';
import { ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Users,
  Briefcase,
  TrendingUp,
  Building2,
  Award,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertTriangle,
  Lock,
  GraduationCap,
  FileText,
  Mail,
  Phone,
  Eye,
  MapPin,
  ExternalLink,
  XCircle,
  PlusCircle,
  UserPlus,
  UserCheck,
  BarChart3,
  Download,
  Calendar,
  Trophy,
  AlertCircle,
  ChevronRight,
  Target,
  Sparkles,
  Plus
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { NotificationHub } from '@/components/NotificationHub';
import { useToast } from '@/hooks/use-toast';
import { api, API_URL } from '@/lib/api';
import { Job, Application, StudentProfile } from '@/types';
import * as XLSX from 'xlsx';

import { useAcademicYear } from '@/contexts/AcademicYearContext';

export default function DashboardPage() {
  const { user } = useAuth();
  const { data } = usePlacementStats();
  const { selectedYear } = useAcademicYear();

  const { toast } = useToast();

  // State for dynamic data
  const [studentProfile, setStudentProfile] = useState<any>(null);
  const [myApplications, setMyApplications] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingJobId, setApplyingJobId] = useState<number | null>(null);
  const [tpcStudents, setTpcStudents] = useState<any[]>([]);
  const [auditTimeframe, setAuditTimeframe] = useState<'30days' | 'historical'>('30days');
  const navigate = useNavigate();

  useEffect(() => {
    if (user?.role === 'student') {
      fetchStudentData();
    } else if (user?.role === 'tpc' || user?.role === 'tpo' || user?.role === 'tpf') {
      fetchStudentsForVerification();
    } else {
      setLoading(false);
    }
  }, [user, selectedYear]);

  const fetchStudentsForVerification = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/students/all?academicYear=${selectedYear}`);
      setTpcStudents(data);
    } catch (err: any) {
      toast({ title: 'Failed to load students', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentData = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const dashData = await api.get('/students/dashboard-summary');

      setStudentProfile({
        ...dashData.profile,
        name: user?.name || dashData.profile.name,
        email: dashData.profile.email || user?.email,
        isTpcVerified: dashData.profile.tpc_verified || false,
        isTpoVerified: dashData.profile.tpo_verified || false,
        verificationStage: dashData.profile.tpo_verified ? 'tpo_verified'
            : dashData.profile.tpc_verified ? 'tpc_verified'
              : 'pending',
      });

      setMyApplications(
        dashData.applications.map((app: any) => ({
          id: app.app_id,
          jobId: app.job_id,
          status: app.status.toLowerCase(),
          appliedAt: app.applied_at,
          jobTitle: app.job_title,
          companyName: app.company_name,
        }))
      );

      setJobs(
        dashData.jobs.map((job: any) => ({
          id: job.job_id,
          title: job.title,
          company: job.company_name,
          deadline: job.deadline,
          minCgpa: job.min_cgpa,
          applicationsCount: parseInt(job.applications_count) || 0,
          isActive: job.status === 'OPEN',
        }))
      );
    } catch (error) {
      console.error('Error fetching student dashboard data:', error);
      setStudentProfile({
        name: user?.name || 'Student',
        email: user?.email,
        isTpcVerified: false,
        isTpoVerified: false,
        verificationStage: 'pending',
        active_backlogs: 0,
        is_placed: false,
        is_verified: false,
        cgpa: null,
        enrollment_no: null,
        department_name: null,
      });
      setMyApplications([]);
      setJobs([]);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const handleApply = async (jobId: number) => {
    setApplyingJobId(jobId);
    try {
      await api.post('/applications', { job_id: jobId });
      toast({
        title: 'Application Submitted!',
        description: 'Your application has been successfully submitted.',
      });
      await fetchStudentData(true); // silent refresh — no loading flash
    } catch (error: any) {
      toast({
        title: 'Application Failed',
        description: error.message || 'Could not submit application. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setApplyingJobId(null);
    }
  };

  if (!user) return null;


  const renderStudentDashboard = () => {
    if (loading) {
      return (
        <div className="space-y-6 p-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-muted/50 animate-pulse" />
          ))}
        </div>
      );
    }

    if (!studentProfile) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
          <GraduationCap className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">Profile Not Found</h2>
          <p className="text-muted-foreground">Please complete your profile setup to access the dashboard.</p>
          <Link to="/profile"><Button>Setup Profile</Button></Link>
        </div>
      );
    }

    // Data Logic: Ensure 'New Jobs' does not list companies present in 'Recent Applications'
    const recentJobs = jobs
      .filter(job => !myApplications.find(app => String(app.jobId) === String(job.id)))
      .slice(0, 3);

    // Pending items logic based on profile status, jobs availability, and profile state
    const pendingTasks = [];
    if (!studentProfile.isTpcVerified) {
      pendingTasks.push({ id: 1, title: 'Complete Profile Verification', type: 'urgent', link: '/profile' });
    }
    if (studentProfile.active_backlogs > 0) {
      pendingTasks.push({ id: 2, title: `Clear ${studentProfile.active_backlogs} Active Backlogs`, type: 'urgent' });
    }
    // Only show "Apply" if not placed AND there are jobs they haven't applied to yet
    if (!studentProfile.is_placed && recentJobs.length > 0) {
      pendingTasks.push({ id: 3, title: 'Apply for Placement Drives', type: 'normal', link: '/jobs' });
    }
    
    // Add resume update if missing OR as a fallback if everything else is done
    if (!studentProfile.resume_url || pendingTasks.length === 0) {
      // Avoid duplicate title if already present
      if (!pendingTasks.some(t => t.id === 4)) {
        pendingTasks.push({ 
          id: 4, 
          title: studentProfile.resume_url ? 'Keep Resume Updated' : 'Upload Your Resume', 
          type: 'normal', 
          link: '/profile' 
        });
      }
    }

    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text">
            Welcome back, {user.name}!
          </h1>
          <p className="text-muted-foreground text-lg">Track your placement journey and applications</p>
        </div>

        {/* Profile Verification Status - Action Required Banner */}
        {!studentProfile.isTpoVerified && (
          <Card className={`glass-card overflow-hidden slide-in-bottom stagger-1 ${!studentProfile.isTpcVerified ? 'border-amber-500/50 dark:border-amber-500/30 shadow-lg shadow-amber-500/10' : 'border-primary/10'}`}>
            <CardHeader className={`${!studentProfile.isTpcVerified ? 'bg-amber-500/10' : 'bg-primary/5'} pb-8`}>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl flex items-center gap-2">
                    {!studentProfile.isTpcVerified && <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />}
                    Profile Verification Status
                  </CardTitle>
                  <CardDescription className={!studentProfile.isTpcVerified ? 'text-amber-600/80 dark:text-amber-500/80 font-medium' : ''}>
                    {!studentProfile.isTpcVerified ? 'Action Required: Verification Pending' : 'Your profile verification progress'}
                  </CardDescription>
                </div>
                {!studentProfile.isTpcVerified && (
                  <Badge variant="outline" className="border-amber-500 text-amber-600 bg-amber-500/10 animate-pulse">
                    Verification Pending
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="-mt-4">
              <div className="bg-card rounded-xl p-6 shadow-sm border border-border/50">
                <VerificationStepper
                  currentStage={studentProfile.verificationStage}
                  isTpcVerified={studentProfile.isTpcVerified}
                  isTpoVerified={studentProfile.isTpoVerified}
                />
                {!studentProfile.isTpoVerified && (
                  <div className={`mt-6 flex items-center gap-2 p-3 rounded-lg text-sm ${!studentProfile.isTpcVerified ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 border border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300'}`}>
                    {studentProfile.isTpcVerified ? <Clock className="h-4 w-4" /> : <AlertTriangle className="h-4 w-4" />}
                    <p>
                      {!studentProfile.isTpcVerified
                        ? "Your profile is pending verification by TPC. You cannot apply to jobs yet."
                        : "Complete your profile verification to apply for placements"}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Student Profile Summary Card */}
        <Card className="glass-card slide-in-bottom stagger-2">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <GraduationCap className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">{studentProfile.name || user.name}</h2>
                  <p className="text-sm text-muted-foreground">{studentProfile.email || user.email}</p>
                </div>
              </div>
              <Badge className={studentProfile.is_placed
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 px-3 py-1'
                : 'bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30 px-3 py-1'
              }>
                {studentProfile.is_placed ? '✓ Placed' : 'Placement Pending'}
              </Badge>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-5 border-t border-border/50">
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">CGPA</p>
                <p className="text-2xl font-bold text-primary">
                  {studentProfile.cgpa ? parseFloat(studentProfile.cgpa).toFixed(2) : 'N/A'}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Department</p>
                <p className="text-sm font-semibold text-foreground mt-1">{studentProfile.department_name || 'N/A'}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">College ID</p>
                <p className="text-sm font-semibold text-foreground mt-1">{studentProfile.enrollment_no || 'N/A'}</p>
              </div>
              {(studentProfile.active_backlogs ?? 0) > 0 && (
                <div className="text-center">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Backlogs</p>
                  <p className="text-2xl font-bold text-red-500">
                    {studentProfile.active_backlogs}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stats — 4 cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 slide-in-bottom stagger-3">
          <StatsCard
            title="CGPA"
            value={studentProfile.cgpa ? parseFloat(studentProfile.cgpa).toFixed(2) : 'N/A'}
            icon={Award}
            subtitle="Academic score"
            className="bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/20 dark:to-transparent"
          />
          <StatsCard
            title="Applications"
            value={myApplications.length}
            icon={Briefcase}
            subtitle="Total submitted"
            className="bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/20 dark:to-transparent"
          />
          <StatsCard
            title="Shortlisted"
            value={myApplications.filter(a => a.status === 'shortlisted').length}
            icon={CheckCircle}
            subtitle="Awaiting next round"
            className="bg-gradient-to-br from-purple-50 to-white dark:from-purple-950/20 dark:to-transparent"
          />
          <StatsCard
            title="Open Positions"
            value={jobs.filter(j => j.isActive).length}
            icon={TrendingUp}
            subtitle="Jobs you can apply to"
            className="bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/20 dark:to-transparent"
          />
        </div>

        {/* Recent Applications */}
        <div className="grid gap-6 lg:grid-cols-3 slide-in-bottom stagger-3">
          <Card className="glass-card lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-xl">Recent Applications</CardTitle>
                <CardDescription>Track your application status</CardDescription>
              </div>
              <Link to="/applications">
                <Button variant="ghost" size="sm" className="gap-1 hover:bg-primary/10 hover:text-primary">
                  View All <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {myApplications.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-20" />
                    <p className="text-sm">No applications yet. Start applying to jobs!</p>
                  </div>
                ) : (
                  myApplications.slice(0, 4).map((app) => (
                    <div key={app.id} className="group flex items-center justify-between rounded-xl border border-border/50 p-4 hover:bg-muted/50 transition-colors duration-300">
                      <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 group-hover:bg-primary/20 transition-colors">
                          <Briefcase className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{app.jobTitle}</p>
                          <p className="text-sm text-muted-foreground">{app.companyName}</p>
                          <p className="text-xs text-muted-foreground/70">Applied {new Date(app.appliedAt).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <ApplicationStatusBadge status={app.status} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Right Column Grid */}
          <div className="space-y-6">
            {/* New Jobs - Compact View with Logos and Urgency */}
            <Card className="glass-card h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-xl">Upcoming Placement Drives</CardTitle>
                </div>
                <Link to="/jobs">
                  <Button variant="ghost" size="icon">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="space-y-4 pt-4">
                {recentJobs.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground">
                    <Building2 className="h-8 w-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">No new drives available.</p>
                  </div>
                ) : (
                  recentJobs.map((job) => {
                    const daysLeft = Math.ceil((new Date(job.deadline).getTime() - Date.now()) / (1000 * 3600 * 24));
                    const isUrgent = daysLeft <= 5 && daysLeft >= 0;
                    const isExpired = daysLeft < 0;
                    return (
                      <div key={job.id} className="relative rounded-xl border border-border/50 bg-card/50 p-4 transition-all hover:shadow-md hover:border-primary/20 group">
                        {isUrgent && (
                          <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm animate-pulse z-10">
                            {daysLeft === 0 ? 'Last Day!' : `${daysLeft}d left`}
                          </div>
                        )}
                        <div className="flex gap-3">
                          <div className="h-10 w-10 rounded-lg bg-white dark:bg-card p-2 flex items-center justify-center border border-border/50 shadow-sm shrink-0">
                            <Building2 className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-sm truncate">{job.company}</h4>
                            <p className="text-xs text-primary/80 font-medium">{job.title}</p>
                            <div className="mt-2 flex items-center justify-between">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Users className="h-3 w-3" /> {job.applicationsCount} applied
                              </div>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className="inline-block">
                                      <Button
                                        size="sm"
                                        className={`h-7 text-xs ${!studentProfile.is_verified ? 'grayscale opacity-70 cursor-not-allowed' : ''}`}
                                        disabled={!studentProfile.is_verified || isExpired || applyingJobId === job.id}
                                        onClick={() => studentProfile.is_verified && !isExpired && handleApply(job.id)}
                                      >
                                        {applyingJobId === job.id ? (
                                          <div className="flex items-center gap-1">
                                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                            Applying...
                                          </div>
                                        ) : !studentProfile.is_verified ? (
                                          <><Lock className="h-3 w-3 mr-1" />Apply</>
                                        ) : isExpired ? 'Expired' : 'Apply Now'}
                                      </Button>
                                    </div>
                                  </TooltipTrigger>
                                  {!studentProfile.is_verified && (
                                    <TooltipContent side="left" className="bg-destructive text-destructive-foreground border-destructive/20">
                                      <p>Profile Verification Pending by TPC</p>
                                    </TooltipContent>
                                  )}
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Actionable Pending Tasks Widget */}
            <Card className="glass-card border-l-4 border-l-blue-500">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  Pending Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pendingTasks.map((task: any) => (
                    <div 
                      key={task.id} 
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-sm"
                      onClick={() => task.link && navigate(task.link)}
                    >
                      <div className={`h-2 w-2 rounded-full ${task.type === 'urgent' ? 'bg-red-500 animate-pulse' : 'bg-blue-500'}`} />
                      <span className="flex-1 font-medium">{task.title}</span>
                      <ArrowRight className="h-3 w-3 text-muted-foreground" />
                    </div>
                  ))}
                  {pendingTasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-2">No pending tasks!</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  };

  const handleQuickVerify = async (studentId: string, stage: string) => {
    try {
      const res = await fetch(`${API_URL}/students/${studentId}/verify`, {
        method: 'PUT',
        headers: {
          'jwt_token': localStorage.getItem('token') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      // Update local state
      setTpcStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          const updated = { ...s };
          if (stage === 'tpc') { updated.isTpcVerified = true; updated.verificationStage = 'tpc_verified'; }
          if (stage === 'tpo') { updated.isTpoVerified = true; updated.verificationStage = 'tpo_verified'; }
          return updated;
        }
        return s;
      }));

      toast({ title: 'Student Verified ✓', description: 'Profile has been verified successfully.' });
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleQuickReject = async (studentId: string, stage: string) => {
    const reason = window.prompt("Enter reason for rejection:");
    if (reason === null) return;

    try {
      const res = await fetch(`${API_URL}/students/${studentId}/reject`, {
        method: 'PUT',
        headers: {
          'jwt_token': localStorage.getItem('token') || '',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stage, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      // Refresh list to update state accordingly
      await fetchStudentsForVerification();

      toast({ 
        title: 'Student Rejected', 
        description: 'Student has been notified to update details.',
        variant: 'destructive'
      });
    } catch (err: any) {
      toast({ title: 'Rejection failed', description: err.message, variant: 'destructive' });
    }
  };

  const renderTPCDashboard = () => {
    const pendingStudents = tpcStudents.filter(s => !s.isTpcVerified);
    const verifiedStudents = tpcStudents.filter(s => s.isTpcVerified);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TPC Dashboard</h1>
          <p className="text-muted-foreground">Verify student profiles from your department</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Pending Verification"
            value={pendingStudents.length}
            icon={Clock}
            iconColor="amber"
            subtitle="Students awaiting TPC verification"
          />
          <StatsCard
            title="Verified"
            value={verifiedStudents.length}
            icon={CheckCircle}
            iconColor="emerald"
            subtitle="Students TPC verified"
          />
          <StatsCard
            title="Total Students"
            value={tpcStudents.length}
            icon={Users}
            iconColor="blue"
            subtitle="Total registered"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Pending Verifications</CardTitle>
            <CardDescription>Students requiring TPC verification</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-4 border-primary border-t-transparent" />
              </div>
            ) : pendingStudents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <CheckCircle className="h-10 w-10 mb-2 text-emerald-500" />
                <p className="font-medium">All students verified!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingStudents.slice(0, 5).map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-bold">
                        {student.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{student.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {student.department} &nbsp;·&nbsp; CGPA: {student.cgpa ?? '—'} &nbsp;·&nbsp; Backlogs: {student.backlogs ?? 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="default" onClick={() => handleQuickVerify(student.id, 'tpc')}>
                        <CheckCircle className="h-4 w-4 mr-1" />
                        Verify
                      </Button>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            Review
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-3">
                              <Avatar className="h-10 w-10 border border-border">
                                {(student as any).profile_picture_url ? (
                                  <img src={`${API_URL}${(student as any).profile_picture_url}`} alt={student.name} className="h-full w-full object-cover rounded-full" />
                                ) : (
                                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-bold">
                                    {student.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <p>{student.name}</p>
                                <p className="text-sm font-normal text-muted-foreground">{student.email}</p>
                              </div>
                            </DialogTitle>
                            <DialogDescription>Complete Student Profile Review</DialogDescription>
                          </DialogHeader>

                          <div className="space-y-5 py-4">
                            {/* Department & Enrollment */}
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs">{student.department}</Badge>
                              {(student as any).enrollment_no && (
                                <Badge variant="outline" className="text-xs">ID: {(student as any).enrollment_no}</Badge>
                              )}
                              {student.isPlaced ? (
                                <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-xs">Placed</Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs text-muted-foreground">Not Placed</Badge>
                              )}
                            </div>

                            {/* Academic Stats Grid */}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Academic Details</p>
                              <div className="grid grid-cols-3 gap-3">
                                <div className="rounded-xl bg-primary/5 p-3 text-center border border-primary/10">
                                  <p className="text-2xl font-bold text-primary">{student.cgpa ?? '—'}</p>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase mt-1">CGPA</p>
                                </div>
                                <div className="rounded-xl bg-muted/30 p-3 text-center border border-border">
                                  <p className={`text-2xl font-bold ${(student.backlogs ?? 0) > 0 ? 'text-red-500' : 'text-emerald-500'}`}>{student.backlogs ?? 0}</p>
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase mt-1">Backlogs</p>
                                </div>
                                <div className="rounded-xl bg-muted/30 p-3 text-center border border-border flex flex-col items-center justify-center">
                                  {((student as any).resume_url) ? (
                                    <a href={`${API_URL}${(student as any).resume_url}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:scale-110 transition-transform">
                                      <FileText className="h-6 w-6" />
                                    </a>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">No Resume</span>
                                  )}
                                  <p className="text-[10px] font-medium text-muted-foreground uppercase mt-1">Resume</p>
                                </div>
                              </div>
                            </div>

                            {/* Schooling Scores */}
                            <div>
                              <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Schooling Scores</p>
                              <div className="grid grid-cols-2 gap-3">
                                <div className="rounded-lg bg-muted/20 p-3 border border-border">
                                  <p className="text-[10px] text-muted-foreground font-medium mb-1 uppercase">10th Score</p>
                                  <p className="text-lg font-bold">{(student as any).class_10_percentage != null ? `${(student as any).class_10_percentage}%` : '—'}</p>
                                </div>
                                <div className="rounded-lg bg-muted/20 p-3 border border-border">
                                  <p className="text-[10px] text-muted-foreground font-medium mb-1 uppercase">
                                    {(student as any).diploma_percentage != null ? 'Diploma' : '12th'} Score
                                  </p>
                                  <p className="text-lg font-bold">
                                    {(student as any).diploma_percentage != null
                                      ? `${(student as any).diploma_percentage}%`
                                      : (student as any).class_12_percentage != null
                                        ? `${(student as any).class_12_percentage}%`
                                        : '—'}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Personal Info */}
                            {((student as any).phone_number || (student as any).gender || (student as any).date_of_birth || (student as any).address || (student as any).linkedin_url) && (
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Personal Details</p>
                                <div className="space-y-2">
                                  {(student as any).phone_number && (
                                    <div className="flex items-center gap-3 text-sm">
                                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground w-20 shrink-0">Phone</span>
                                      <span className="font-medium">{(student as any).phone_number}</span>
                                    </div>
                                  )}
                                  {(student as any).gender && (
                                    <div className="flex items-center gap-3 text-sm">
                                      <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground w-20 shrink-0">Gender</span>
                                      <span className="font-medium">{(student as any).gender}</span>
                                    </div>
                                  )}
                                  {(student as any).date_of_birth && (
                                    <div className="flex items-center gap-3 text-sm">
                                      <Award className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground w-20 shrink-0">DOB</span>
                                      <span className="font-medium">{new Date((student as any).date_of_birth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                                    </div>
                                  )}
                                  {(student as any).address && (
                                    <div className="flex items-start gap-3 text-sm">
                                      <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                                      <span className="text-muted-foreground w-20 shrink-0">Address</span>
                                      <span className="font-medium">{(student as any).address}</span>
                                    </div>
                                  )}
                                  {(student as any).linkedin_url && (
                                    <div className="flex items-center gap-3 text-sm">
                                      <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                                      <span className="text-muted-foreground w-20 shrink-0">LinkedIn</span>
                                      <a href={(student as any).linkedin_url} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline truncate">
                                        {(student as any).linkedin_url}
                                      </a>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}


                            {/* Action Buttons */}
                            {!student.isTpcVerified && (
                              <div className="flex gap-3 pt-2 border-t border-border">
                                <Button className="flex-1 gap-2" onClick={() => handleQuickVerify(student.id, 'tpc')}>
                                  <CheckCircle className="h-4 w-4" />
                                  Verify Student
                                </Button>
                                <Button variant="outline" className="text-destructive hover:bg-destructive/10 gap-2" onClick={() => handleQuickReject(student.id, 'tpc')}>
                                  <XCircle className="h-4 w-4" />
                                  Reject
                                </Button>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                ))}
                {pendingStudents.length > 5 && (
                  <Link to="/verify-students" className="block text-center text-sm text-primary hover:underline pt-2">
                    View all {pendingStudents.length} pending students →
                  </Link>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  };



  const exportPlacementReport = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/students/all?academicYear=${selectedYear}`);

      if (!res.length) {
        toast({ title: 'No data to export', description: `No students found for academic year ${selectedYear}`, variant: 'destructive' });
        return;
      }

      // Convert to Excel format for better aesthetics as requested
      const worksheetData = res.map((s: any) => ({
        'Name': s.name,
        'Enrollment No': s.enrollment_no || 'N/A',
        'Department': s.department,
        'Gender': s.gender || 'N/A',
        'Academic Year': selectedYear,
        'Placement Status': s.isPlaced ? 'Placed' : 'Not Placed',
        'Company': s.placedCompanyName || 'N/A',
        'CGPA': s.cgpa || '0.0',
        'Verification': s.verificationStage === 'tpo_verified' ? 'Fully Verified' : 'In Progress'
      }));

      const worksheet = XLSX.utils.json_to_sheet(worksheetData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Placement Report');
      
      const filename = `Placement_Report_${selectedYear}_${new Date().toISOString().split('T')[0]}.xlsx`;
      XLSX.writeFile(workbook, filename);

      toast({ title: 'Report Downloaded!', description: filename });
    } catch (err: any) {
      toast({ title: 'Export failed', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const renderTPODashboard = () => {
    // Dynamic data
    const finalVerificationQueue = tpcStudents.filter(s => s.isTpcVerified && !s.isTpoVerified);

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">TPO Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage placements, companies, and final verifications</p>
        </div>

        {/* Quick Actions Panel */}
        <div className="grid gap-4 md:grid-cols-5">
          {/* Post Job Drive */}
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center p-6 h-auto gap-3 hover:bg-blue-50/60 hover:border-blue-400/60 dark:hover:bg-blue-950/20 transition-all cursor-pointer group"
            onClick={() => navigate('/manage-jobs')}
          >
            <div className="p-3.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-lg shadow-blue-400/30 ring-2 ring-blue-300/40 group-hover:scale-110 transition-transform">
              <PlusCircle className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-center text-foreground">Post Job Drive</span>
          </Button>

          {/* Add Company */}
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center p-6 h-auto gap-3 hover:bg-emerald-50/60 hover:border-emerald-400/60 dark:hover:bg-emerald-950/20 transition-all cursor-pointer group"
            onClick={() => navigate('/companies')}
          >
            <div className="p-3.5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-400/30 ring-2 ring-emerald-300/40 group-hover:scale-110 transition-transform">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-center text-foreground">Add Company</span>
          </Button>

          {/* Verify Students */}
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center p-6 h-auto gap-3 hover:bg-violet-50/60 hover:border-violet-400/60 dark:hover:bg-violet-950/20 transition-all cursor-pointer group"
            onClick={() => navigate('/final-verification')}
          >
            <div className="p-3.5 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-400/30 ring-2 ring-violet-300/40 group-hover:scale-110 transition-transform">
              <UserCheck className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-center text-foreground">Verify Students</span>
          </Button>

          {/* View Analytics */}
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center p-6 h-auto gap-3 hover:bg-amber-50/60 hover:border-amber-400/60 dark:hover:bg-amber-950/20 transition-all cursor-pointer group"
            onClick={() => navigate('/analytics')}
          >
            <div className="p-3.5 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl shadow-lg shadow-amber-400/30 ring-2 ring-amber-300/40 group-hover:scale-110 transition-transform">
              <BarChart3 className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-center text-foreground">View Analytics</span>
          </Button>

          {/* Export Report */}
          <Button
            variant="outline"
            className="flex flex-col items-center justify-center p-6 h-auto gap-3 hover:bg-rose-50/60 hover:border-rose-400/60 dark:hover:bg-rose-950/20 transition-all cursor-pointer group"
            onClick={exportPlacementReport}
          >
            <div className="p-3.5 bg-gradient-to-br from-rose-500 to-pink-600 rounded-2xl shadow-lg shadow-rose-400/30 ring-2 ring-rose-300/40 group-hover:scale-110 transition-transform">
              <Download className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-xs sm:text-sm text-center text-foreground">Export Report</span>
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <StatsCard
            title="Total Students"
            value={data.stats.totalStudents}
            icon={Users}
            iconColor="blue"
          />
          <StatsCard
            title="Placed"
            value={data.stats.placedStudents}
            icon={Award}
            iconColor="emerald"
            trend={{ value: 12, isPositive: true }}
          />
          <StatsCard
            title="Active Jobs"
            value={data.stats.activeJobs}
            icon={Briefcase}
            iconColor="violet"
          />
          <StatsCard
            title="Companies"
            value={data.stats.companiesVisited}
            icon={Building2}
            iconColor="orange"
          />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <PlacementChart data={data.branchPlacements} type="bar" />

          <Card>
            <CardHeader>
              <CardTitle>Final Verification Queue</CardTitle>
              <CardDescription>Students awaiting TPO final verification</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {finalVerificationQueue.slice(0, 5).map((student) => (
                  <div key={student.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm">
                        {student.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                      </div>
                      <div>
                        <p className="font-medium text-foreground text-sm">{student.name}</p>
                        <p className="text-xs text-muted-foreground">{student.department}</p>
                      </div>
                    </div>
                    <Link to="/final-verification">
                      <Button size="sm" variant="outline">Verify</Button>
                    </Link>
                  </div>
                ))}
                {finalVerificationQueue.length > 5 && (
                  <Link to="/final-verification" className="block text-center text-sm text-primary hover:underline pt-2">
                    View all {finalVerificationQueue.length} pending students →
                  </Link>
                )}
                {finalVerificationQueue.length === 0 && (
                  <div className="text-center py-6 text-muted-foreground">
                    <CheckCircle className="h-8 w-8 mx-auto mb-2 opacity-20 text-emerald-500" />
                    <p className="text-sm">All verifications complete!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderTPFDashboard = () => {
    // Only show students from TPF's department
    const allDeptStudents = tpcStudents.filter(s => s.department === user?.department);
    const verifiedDeptStudents = allDeptStudents.filter(s => s.isTpcVerified && s.isTpoVerified);
    const pendingFollowUpStudents = allDeptStudents.filter(s => !s.isTpcVerified || !s.isTpoVerified);
    const placedCount = verifiedDeptStudents.filter(s => s.isPlaced).length;

    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{user?.department} Faculty Dashboard</h1>
          <p className="text-muted-foreground">Monitor department placement progress and student status</p>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatsCard
            title="Total Registered"
            value={allDeptStudents.length}
            icon={Users}
            iconColor="blue"
            subtitle="Registered in department"
          />
          <StatsCard
            title="Placed Students"
            value={placedCount}
            icon={Award}
            iconColor="emerald"
            subtitle={`${verifiedDeptStudents.length > 0 ? ((placedCount / verifiedDeptStudents.length) * 100).toFixed(1) : 0}% placement rate`}
          />
          <StatsCard
            title="Verified by Admin"
            value={verifiedDeptStudents.length}
            icon={CheckCircle}
            iconColor="sky"
            subtitle={`${allDeptStudents.length > 0 ? ((verifiedDeptStudents.length / allDeptStudents.length) * 100).toFixed(0) : 0}% verification progress`}
          />
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Department Student Monitor</CardTitle>
                <CardDescription>Track onboarding and placement progress</CardDescription>
              </div>
              <Badge variant="outline" className="gap-1 px-3 py-1">
                <Users className="h-3 w-3" />
                {allDeptStudents.length} Total Students
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="verified" className="w-full">
              <TabsList className="grid w-full max-w-[400px] grid-cols-2 mb-6">
                <TabsTrigger value="verified" className="gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Verified
                  <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-5 flex items-center justify-center rounded-full bg-emerald-100 text-emerald-700 border-none">{verifiedDeptStudents.length}</Badge>
                </TabsTrigger>
                <TabsTrigger value="pending" className="gap-2">
                  <AlertCircle className="h-4 w-4" />
                  Pending Follow-up
                  <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-5 flex items-center justify-center rounded-full bg-amber-100 text-amber-700 border-none">{pendingFollowUpStudents.length}</Badge>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="verified">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-foreground">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Name</th>
                        <th className="pb-3 font-medium text-muted-foreground">CGPA</th>
                        <th className="pb-3 font-medium text-muted-foreground">Placement Status</th>
                        <th className="pb-3 font-medium text-muted-foreground text-right w-[100px]">Profile</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {verifiedDeptStudents.map((student) => (
                        <tr key={student.id} className="group hover:bg-muted/50 transition-colors">
                          <td className="py-3 font-medium">{student.name}</td>
                          <td className="py-3">{student.cgpa}</td>
                          <td className="py-3">
                            {student.isPlaced ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Placed @ {student.placedCompanyName || 'N/A'}</Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground">Not Placed</Badge>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100">
                              <Link to={`/students`}>
                                <ChevronRight className="h-4 w-4" />
                              </Link>
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {verifiedDeptStudents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-muted-foreground italic">
                            No fully verified students yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="pending">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-foreground">
                    <thead>
                      <tr className="border-b border-border text-left">
                        <th className="pb-3 font-medium text-muted-foreground">Name</th>
                        <th className="pb-3 font-medium text-muted-foreground">CGPA</th>
                        <th className="pb-3 font-medium text-muted-foreground">Current Stage</th>
                        <th className="pb-3 font-medium text-muted-foreground">Action Needed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {pendingFollowUpStudents.map((student) => (
                        <tr key={student.id} className="hover:bg-muted/50 transition-colors">
                          <td className="py-3 font-medium">{student.name}</td>
                          <td className="py-3">{student.cgpa}</td>
                          <td className="py-3">
                            {!student.isTpcVerified ? (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">Awaiting TPC Review</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20">Awaiting TPO Review</Badge>
                            )}
                          </td>
                          <td className="py-3">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              Advise to follow up with {!student.isTpcVerified ? 'TPC' : 'TPO'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {pendingFollowUpStudents.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-12 text-center text-emerald-600 bg-emerald-50/50 rounded-lg">
                            <div className="flex flex-col items-center gap-1">
                                <CheckCircle className="h-6 w-6 stroke-emerald-600" />
                                <p className="font-medium">Great work! All students in your department are fully verified.</p>
                            </div>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderPrincipalDashboard = () => {
    const placementRate = data.stats.totalStudents > 0
      ? ((data.stats.placedStudents / data.stats.totalStudents) * 100).toFixed(1)
      : '0.0';

    const totalRegistered = data.stats.totalStudents;
    const universityPlacementRate = totalRegistered > 0 ? ((data.stats.placedStudents / totalRegistered) * 100).toFixed(1) : 0;
    
    // Strategic insights
    const topPerformingBranch = [...data.branchPlacements].sort((a, b) => b.percentage - a.percentage)[0];
    const needsFocusBranch = [...data.branchPlacements].sort((a, b) => a.percentage - b.percentage)[0];

    return (
      <div className="space-y-8 pb-12">
        {/* Prime Strategic Header */}
        <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 text-white shadow-2xl">
          <div className="absolute top-0 right-0 -mt-20 -mr-20 h-64 w-64 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 -mb-20 -ml-20 h-64 w-64 rounded-full bg-emerald-600/20 blur-3xl" />
          
          <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 border border-white/20 backdrop-blur-md text-xs font-semibold text-blue-300">
                <Target className="h-3 w-3" /> Strategic Overview {selectedYear}
              </div>
              <h1 className="text-4xl font-black tracking-tight leading-none">University Success Hub</h1>
              <p className="text-slate-400 max-w-xl text-lg">
                Driving excellence through departmental collaboration and corporate partnerships.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button 
                variant="outline" 
                className="bg-white/5 border-white/10 text-white hover:bg-white/10 hover:text-white backdrop-blur-md rounded-xl px-6"
                onClick={exportPlacementReport}
              >
                <Download className="h-4 w-4 mr-2" /> Annual Report
              </Button>
              <Button 
                className="bg-blue-600 hover:bg-blue-500 text-white shadow-xl shadow-blue-900/50 rounded-xl px-6"
                onClick={() => navigate('/analytics')}
              >
                <TrendingUp className="h-4 w-4 mr-2" /> Global Forecast
              </Button>
            </div>
          </div>
        </div>

        {/* Global Performance Pulse */}
        <div className="grid gap-6 md:grid-cols-4">
          {[
            { label: 'Total Intake', value: totalRegistered, icon: Users, color: 'blue', trend: '+12%' },
            { label: 'Placed Alumni', value: data.stats.placedStudents, icon: Award, color: 'emerald', trend: '+5.4%' },
            { label: 'Corporate Partners', value: data.stats.companiesVisited, icon: Building2, color: 'amber', trend: '+15' },
            { label: 'Campus Drives', value: data.stats.activeJobs, icon: Briefcase, color: 'violet', trend: 'Live' }
          ].map((stat, i) => (
            <Card key={i} className="group relative overflow-hidden border-none shadow-lg shadow-slate-200/50 dark:shadow-none bg-white dark:bg-slate-900/50 backdrop-blur-xl">
              <CardContent className="p-6">
                <div className={`p-3 rounded-2xl bg-${stat.color}-500/10 text-${stat.color}-600 dark:text-${stat.color}-400 w-fit mb-4 group-hover:scale-110 transition-transform`}>
                  <stat.icon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                  <div className="flex items-baseline justify-between">
                    <h3 className="text-3xl font-bold">{stat.value}</h3>
                    <span className={`text-xs font-bold ${stat.trend.startsWith('+') ? 'text-emerald-600' : 'text-blue-600'} bg-current/10 px-2 py-0.5 rounded-full`}>
                      {stat.trend}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Strategic Cards */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Top Branch Spotlight */}
          <Card className="bg-gradient-to-br from-emerald-600 to-teal-700 text-white border-none shadow-xl shadow-emerald-900/20 overflow-hidden relative group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
               <Trophy className="h-32 w-32" />
            </div>
            <CardHeader>
              <CardTitle className="text-emerald-50/80 text-sm font-bold uppercase tracking-widest">Star Performance</CardTitle>
              <h2 className="text-3xl font-black mt-2">{topPerformingBranch?.branch || 'N/A'}</h2>
              <CardDescription className="text-emerald-100/60 font-medium">Leading the university in placement rate</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-5xl font-black tracking-tighter">
                {topPerformingBranch?.percentage.toFixed(1)}%
              </div>
              <div className="mt-6 flex items-center gap-2 text-sm bg-black/10 backdrop-blur-sm rounded-lg p-3 border border-white/10 italic">
                <Sparkles className="h-4 w-4 text-amber-300" /> "Setting new benchmarks in corporate readiness."
              </div>
            </CardContent>
          </Card>

          {/* Department Comparison Chart */}
          <Card className="lg:col-span-2 border-slate-200/60 dark:border-slate-800 shadow-xl shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/40 backdrop-blur-md overflow-hidden">
             <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                   <CardTitle className="text-lg font-bold">Department Success Metrics</CardTitle>
                   <CardDescription>Visual comparison of placement percentage per branch</CardDescription>
                </div>
             </CardHeader>
             <CardContent className="pt-8">
                <PlacementChart data={data.branchPlacements} type="bar" />
             </CardContent>
          </Card>
        </div>

        {/* Global Audit Log */}
        <Card className="border-slate-200/60 dark:border-slate-800 shadow-2xl shadow-slate-200/40 dark:shadow-none bg-white/80 dark:bg-slate-900/60 backdrop-blur-xl overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 py-6 px-8">
            <div className="space-y-1">
              <CardTitle className="text-xl font-black">Branch Health Audit</CardTitle>
              <CardDescription className="text-sm font-medium">Monitoring departmental efficiency and placement velocity</CardDescription>
            </div>
            <div className="flex bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-2xl w-fit items-center shadow-inner">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setAuditTimeframe('30days')}
                className={`rounded-xl px-5 py-4 text-[14px] font-bold transition-all duration-300 h-10 ${
                  auditTimeframe === '30days' 
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-800 hover:text-slate-900 hover:bg-white/50 dark:text-slate-300'
                }`}
              >
                Last 30 Days
              </Button>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => setAuditTimeframe('historical')}
                className={`rounded-xl px-5 py-4 text-[14px] font-bold transition-all duration-300 h-10 ${
                  auditTimeframe === 'historical' 
                    ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white' 
                    : 'text-slate-800 hover:text-slate-900 hover:bg-white/50 dark:text-slate-300'
                }`}
              >
                Historical
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-left text-xs uppercase tracking-[0.1em] font-black text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-8 py-5">Department</th>
                    <th className="px-8 py-5">Strength</th>
                    <th className="px-8 py-5">Placement Success</th>
                    <th className="px-8 py-5">Growth Index</th>
                    <th className="px-8 py-5 text-right">Strategic Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {data.branchPlacements.map((branch) => (
                    <tr key={branch.branch} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-all duration-300 group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center font-black text-sm ring-4 ring-offset-4 dark:ring-offset-slate-900 shadow-lg ${branch.percentage > 70 ? 'bg-emerald-500 text-white ring-emerald-500/10' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 ring-slate-500/10'}`}>
                            {branch.branch.substring(0, 1).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-extrabold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">{branch.branch}</p>
                            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider">Engineering Stream</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 font-bold text-slate-500">{branch.total} Candidates</td>
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                           <span className="font-black text-lg text-slate-900 dark:text-slate-100">{branch.placed}</span>
                           <div className="flex-1 min-w-[120px] max-w-[200px]">
                              <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/50 dark:border-slate-700">
                                 <div 
                                  className={`h-full transition-all duration-1000 rounded-full ${branch.percentage > 70 ? 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]' : branch.percentage > 40 ? 'bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.5)]' : 'bg-amber-500'}`}
                                  style={{ width: `${branch.percentage}%` }}
                                 />
                              </div>
                           </div>
                           <span className="text-xs font-bold text-muted-foreground w-10 text-right">{branch.percentage.toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                         <div className="flex items-center gap-1.5 text-emerald-600 font-black">
                            <TrendingUp className="h-4 w-4" />
                            { (Math.random() * 5 + 1).toFixed(1) }%
                         </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                         <Badge 
                          className={`rounded-xl px-4 py-1 font-bold border-none shadow-sm ${branch.percentage > 70 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600'}`}
                         >
                            {branch.percentage > 70 ? 'Elite Performance' : 'Growth Focus'}
                         </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };


  const renderDashboardContent = () => {
    switch (user.role) {
      case 'student':
        return renderStudentDashboard();
      case 'tpc':
        return renderTPCDashboard();
      case 'tpf':
        return renderTPFDashboard();
      case 'tpo':
        return renderTPODashboard();
      case 'principal':
        return renderPrincipalDashboard();
      default:
        return renderStudentDashboard();
    }
  };

  return (
    <DashboardLayout>
      {renderDashboardContent()}
    </DashboardLayout>
  );
}
