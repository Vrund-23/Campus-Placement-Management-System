import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ApplicationStatusBadge } from '@/components/ApplicationStatusBadge';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar, Building2, Loader2 } from 'lucide-react';
import { ApplicationStatus } from '@/types';

interface Application {
  app_id: number;
  job_id: number;
  student_id: number;
  status: string;
  applied_at: string;
  updated_at?: string;
  job_title: string;
  company_name: string;
  deadline: string;
  website?: string;
}

export default function ApplicationsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'all' | ApplicationStatus>('all');
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const data = await api.get('/applications/me');
      setApplications(Array.isArray(data) ? data : []);
    } catch (error: any) {
      console.error('Error fetching applications:', error);
      toast({
        title: 'Error',
        description: 'Failed to load applications. Please try again.',
        variant: 'destructive',
      });
      setApplications([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredApplications = activeTab === 'all'
    ? applications
    : applications.filter(app => app.status.toLowerCase() === activeTab);

  const statusCounts = {
    all: applications.length,
    applied: applications.filter(a => a.status.toLowerCase() === 'applied').length,
    shortlisted: applications.filter(a => a.status.toLowerCase() === 'shortlisted').length,
    placed: applications.filter(a => a.status.toLowerCase() === 'placed').length,
    rejected: applications.filter(a => a.status.toLowerCase() === 'rejected').length,
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
          <h1 className="text-2xl font-bold text-foreground">My Applications</h1>
          <p className="text-muted-foreground">Track your job application status</p>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)} className="w-full">
          <TabsList className="w-full h-auto flex-wrap justify-start gap-2 bg-transparent p-0 border-0">
            <TabsTrigger
              value="all"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all border border-border data-[state=active]:border-primary"
            >
              <span className="font-medium">All</span>
              <Badge
                variant="secondary"
                className="min-w-[28px] h-6 justify-center px-2 data-[state=active]:bg-primary-foreground/20"
              >
                {statusCounts.all}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="applied"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-blue-600 data-[state=active]:text-white rounded-lg transition-all border border-border data-[state=active]:border-blue-600"
            >
              <span className="font-medium">Applied</span>
              <Badge
                variant="secondary"
                className="min-w-[28px] h-6 justify-center px-2 data-[state=active]:bg-white/20"
              >
                {statusCounts.applied}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="shortlisted"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-amber-600 data-[state=active]:text-white rounded-lg transition-all border border-border data-[state=active]:border-amber-600"
            >
              <span className="font-medium">Shortlisted</span>
              <Badge
                variant="secondary"
                className="min-w-[28px] h-6 justify-center px-2 data-[state=active]:bg-white/20"
              >
                {statusCounts.shortlisted}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="placed"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-green-600 data-[state=active]:text-white rounded-lg transition-all border border-border data-[state=active]:border-green-600"
            >
              <span className="font-medium">Placed</span>
              <Badge
                variant="secondary"
                className="min-w-[28px] h-6 justify-center px-2 data-[state=active]:bg-white/20"
              >
                {statusCounts.placed}
              </Badge>
            </TabsTrigger>

            <TabsTrigger
              value="rejected"
              className="flex items-center gap-2 px-4 py-2.5 data-[state=active]:bg-red-600 data-[state=active]:text-white rounded-lg transition-all border border-border data-[state=active]:border-red-600"
            >
              <span className="font-medium">Rejected</span>
              <Badge
                variant="secondary"
                className="min-w-[28px] h-6 justify-center px-2 data-[state=active]:bg-white/20"
              >
                {statusCounts.rejected}
              </Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            <div className="space-y-4">
              {filteredApplications.map((application) => {
                const statusLower = application.status.toLowerCase() as ApplicationStatus;

                return (
                  <Card key={application.app_id} className="transition-all hover:shadow-md">
                    <CardContent className="p-6">
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="flex items-start gap-4">
                          <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-primary/10 flex-shrink-0">
                            <Building2 className="h-7 w-7 text-primary" />
                          </div>
                          <div className="space-y-1 flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-foreground">
                              {application.job_title}
                            </h3>
                            <p className="text-muted-foreground">{application.company_name}</p>
                            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Applied: {new Date(application.applied_at).toLocaleDateString()}
                              </span>
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5" />
                                Deadline: {new Date(application.deadline).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 flex-shrink-0">
                          {application.updated_at && (
                            <div className="text-right text-sm text-muted-foreground hidden md:block">
                              <p>Last updated</p>
                              <p className="font-medium text-foreground">
                                {new Date(application.updated_at).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                          <ApplicationStatusBadge status={statusLower} />
                        </div>
                      </div>

                      {/* Application Timeline */}
                      <div className="mt-4 pt-4 border-t border-border">
                        <div className="flex items-center gap-2 text-sm overflow-x-auto pb-2">
                          <span className="text-muted-foreground flex-shrink-0">Progress:</span>
                          <div className="flex items-center gap-2">
                            {((application as any).selection_process || ['Applied', 'Aptitude', 'Coding Round', 'Technical Interview', 'HR Interview', 'Placed']).map((round: string, index: number, arr: string[]) => {
                              const currentStatusLower = statusLower;
                              // Determine if this round is active/completed.
                              // Since statuses might not perfectly match round names, we assume 'applied' is always completed,
                              // and 'placed' means all rounds are completed.
                              // Otherwise, a round is 'completed' if its index <= the index of a matching status.
                              // If there is no match, we fallback to just checking if the status is equivalent (e.g. 'shortlisted' completing mid-rounds).
                              const matchingStatusIdx = arr.findIndex(r => r.toLowerCase() === currentStatusLower);

                              let isCompleted = false;
                              if (currentStatusLower === 'placed') {
                                isCompleted = true; // All rounds passed if placed
                              } else if (matchingStatusIdx !== -1) {
                                isCompleted = index <= matchingStatusIdx; // Current and past rounds
                              } else if (currentStatusLower === 'applied') {
                                isCompleted = index === 0; // Only first round completed
                              } else if (currentStatusLower === 'shortlisted' || currentStatusLower === 'rejected') {
                                // Just highlight first item to show they applied, and if they're rejected process usually stops
                                isCompleted = index === 0;
                              }

                              return (
                                <div key={index} className="flex items-center gap-2 flex-shrink-0">
                                  <div className="flex items-center gap-1">
                                    <div className={`h-2 w-2 rounded-full ${isCompleted ? 'bg-primary' : 'bg-muted'}`} />
                                    <span className={`text-sm ${isCompleted ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                      {round}
                                    </span>
                                  </div>
                                  {index < arr.length - 1 && (
                                    <div className={`h-px w-6 lg:w-8 ${isCompleted && (currentStatusLower === 'placed' || (matchingStatusIdx !== -1 && index < matchingStatusIdx))
                                        ? 'bg-primary'
                                        : 'bg-border'
                                      }`} />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {filteredApplications.length === 0 && (
                <Card>
                  <CardContent className="flex flex-col items-center justify-center py-12">
                    <Briefcase className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No applications found</h3>
                    <p className="text-muted-foreground text-center">
                      {activeTab === 'all'
                        ? "You haven't applied to any jobs yet"
                        : `No ${activeTab} applications`}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
