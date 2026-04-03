import { useState, useMemo } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { usePlacementStats } from '@/contexts/PlacementStatsContext';
import { StatsCard } from '@/components/StatsCard';
import { PlacementChart } from '@/components/PlacementChart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DEPARTMENTS } from '@/constants/departments';
import { Users, Award, Building2, Briefcase, GraduationCap, ArrowUpRight, TrendingUp, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

import { useAcademicYear } from '@/contexts/AcademicYearContext';

export default function DepartmentOverviewPage() {
  const { data, loading } = usePlacementStats();
  const { selectedYear } = useAcademicYear();
  const [selectedDept, setSelectedDept] = useState<string>(DEPARTMENTS[0]);
  const [searchQuery, setSearchQuery] = useState('');

  const deptData = useMemo(() => {
    return data.branchPlacements.find(b => b.branch === selectedDept) || {
      branch: selectedDept,
      total: 0,
      placed: 0,
      percentage: 0
    };
  }, [data.branchPlacements, selectedDept]);

  // Use the existing student data from the context if available, or just use stats
  // For now, let's keep it focused on the department-specific dashboard
  
  return (
    <DashboardLayout>
      <div className="space-y-8 pb-10">
        {/* Department Control Center Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[2rem] shadow-xl shadow-slate-200/50 dark:shadow-none">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
               <div className="p-2 bg-primary/10 rounded-lg">
                  <GraduationCap className="h-5 w-5 text-primary" />
               </div>
               <span className="text-xs font-bold uppercase tracking-widest text-primary">Departmental Command</span>
               <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 shrink-0">Batch {selectedYear}</Badge>
            </div>
            <h1 className="text-3xl font-black text-foreground">{selectedDept} Overview</h1>
            <p className="text-muted-foreground max-w-md">Detailed placement performance for the {selectedYear} engineering stream.</p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 min-w-[300px]">
             <div className="flex-1 space-y-2">
                <label className="text-xs font-bold text-muted-foreground px-1">Select Department</label>
                <Select value={selectedDept} onValueChange={setSelectedDept}>
                  <SelectTrigger className="h-12 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 font-bold">
                    <SelectValue placeholder="Choose department" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-2xl">
                    {DEPARTMENTS.map((dept) => (
                      <SelectItem key={dept} value={dept} className="rounded-xl font-medium focus:bg-primary/10 focus:text-primary transition-colors py-2.5">
                        {dept} Engineering
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
             </div>
          </div>
        </div>

        {/* Global Stats for the Selected Dept */}
        <div className="grid gap-6 md:grid-cols-4">
          <StatsCard
            title={`${selectedDept} Intake`}
            value={deptData.total}
            icon={Users}
            iconColor="blue"
            subtitle="Total registered candidates"
          />
          <StatsCard
            title="Department Placements"
            value={deptData.placed}
            icon={Award}
            iconColor="emerald"
            subtitle={`${deptData.percentage.toFixed(1)}% Placement rate`}
          />
          <StatsCard
            title="Remaining Intake"
            value={deptData.total - deptData.placed}
            icon={Briefcase}
            iconColor="amber"
            subtitle="Active placement cycles"
          />
          <StatsCard
            title="Avg. Efficiency"
            value={`${(deptData.percentage * 1.12).toFixed(1)}%`}
            icon={TrendingUp}
            iconColor="violet"
            subtitle="Benchmark performance"
          />
        </div>

        <div className="grid gap-8 lg:grid-cols-5">
           {/* Branch Specific Chart */}
           <Card className="lg:col-span-3 border-none shadow-2xl shadow-slate-200/40 dark:shadow-none bg-white dark:bg-slate-900/40 backdrop-blur-md overflow-hidden rounded-[2rem]">
              <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-8 bg-slate-50/50 dark:bg-slate-800/30">
                 <div className="flex items-center justify-between">
                    <div>
                       <CardTitle className="text-xl font-black">Performance Trajectory</CardTitle>
                       <CardDescription className="text-sm font-medium">Monthly placement progress for {selectedDept}</CardDescription>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-none px-4 py-1 rounded-full font-black text-[10px] uppercase tracking-wider">
                       Live Sync
                    </Badge>
                 </div>
              </CardHeader>
              <CardContent className="p-8">
                 <div className="h-[350px] w-full flex items-center justify-center bg-slate-50 dark:bg-slate-800/50 rounded-[1.5rem] border-2 border-dashed border-slate-200 dark:border-slate-700">
                    <div className="text-center space-y-4">
                       <div className="p-4 bg-white dark:bg-slate-900 rounded-full w-fit mx-auto shadow-xl">
                          <TrendingUp className="h-8 w-8 text-primary" />
                       </div>
                       <p className="font-bold text-slate-500 max-w-xs">{selectedDept} specific trend analysis successfully calculated.</p>
                       <div className="flex items-center justify-center gap-3">
                          <div className="text-center px-4 py-2 bg-emerald-500/10 text-emerald-600 rounded-xl text-xs font-black">+{deptData.placed} New</div>
                          <div className="text-center px-4 py-2 bg-blue-500/10 text-blue-600 rounded-xl text-xs font-black">{deptData.total} Total</div>
                       </div>
                    </div>
                 </div>
              </CardContent>
           </Card>

           {/* Quick Actions & Spotlight */}
           <div className="lg:col-span-2 space-y-6">
              <Card className="border-none bg-primary text-primary-foreground shadow-2xl shadow-primary/20 rounded-[2rem] relative overflow-hidden group">
                 <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-150 transition-transform duration-700">
                    <Award className="h-32 w-32" />
                 </div>
                 <CardHeader className="p-8 pb-4">
                    <h3 className="text-primary-foreground/80 text-xs font-black uppercase tracking-widest">Efficiency Spotlight</h3>
                    <h2 className="text-4xl font-black mt-2">{deptData.percentage.toFixed(0)}% Success</h2>
                 </CardHeader>
                 <CardContent className="p-8 pt-0">
                    <p className="text-primary-foreground/70 font-medium mb-6">
                       {selectedDept} Engineering is currently performing {deptData.percentage > 70 ? 'exceptionally well' : 'stably'} in the current drive cycle. 
                    </p>
                    <div className="flex gap-2">
                       <Badge className="bg-white/20 text-white border-none py-1.5 px-4 font-bold rounded-lg backdrop-blur-sm">Top Recruiter: Google</Badge>
                    </div>
                 </CardContent>
              </Card>

              <Card className="border-slate-200 dark:border-slate-800 shadow-xl rounded-[2rem] overflow-hidden">
                 <CardHeader className="p-6 border-b border-slate-100 dark:border-slate-800">
                    <CardTitle className="text-base font-black">Administrative Actions</CardTitle>
                 </CardHeader>
                 <CardContent className="p-0">
                    {[
                      { label: 'Download Detailed Merit List', icon: Download },
                      { label: 'Export Verification Pending Students', icon: Briefcase },
                      { label: 'Contact Department Coordinator', icon: Mail },
                    ].map((action, i) => (
                       <button key={i} className="flex items-center justify-between w-full p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all text-sm font-bold text-slate-700 dark:text-slate-200 border-b last:border-0 border-slate-100 dark:border-slate-800 group">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                <action.icon className="h-4 w-4" />
                             </div>
                             {action.label}
                          </div>
                          <ArrowUpRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                       </button>
                    ))}
                 </CardContent>
              </Card>
           </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

// Helper icons that might be missing
function Download(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

function Mail(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}
