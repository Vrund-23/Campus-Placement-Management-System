import { useState, useEffect } from 'react';
import { DEPARTMENTS } from '@/constants/departments';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StudentVerificationCard } from '@/components/StudentVerificationCard';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Users, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { StudentProfile } from '@/types';
import { api, API_URL } from '@/lib/api';
import { getAuthHeader } from '@/lib/api';
import { useLocation } from 'react-router-dom';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter } from 'lucide-react';

import { useAcademicYear } from '@/contexts/AcademicYearContext';

export default function VerifyStudentsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { selectedYear } = useAcademicYear();
  const [searchQuery, setSearchQuery] = useState('');
  const [students, setStudents] = useState<StudentProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'verified' | 'all'>('pending');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedPlacement, setSelectedPlacement] = useState<string>('all');
  const location = useLocation();
  const isAllStudentsRoute = location.pathname === '/students';

  const departments = DEPARTMENTS;

  const verificationType = user?.role === 'tpc' ? 'tpc' : (user?.role === 'tpf' ? 'tpc' : 'tpo');

  // Fetch all students from backend
  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/students/all?academicYear=${selectedYear}`);
      setStudents(data);
    } catch (err: any) {
      toast({ title: 'Failed to load students', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
    if (user?.department && (user.role === 'tpc' || user.role === 'tpf')) {
      setSelectedDept(user.department);
    }
  }, [user, selectedYear]);

  const getPendingStudents = () => {
    if (isAllStudentsRoute) return []; // Not used in 'all' view
    switch (verificationType) {
      case 'tpc': return students.filter(s => !s.isTpcVerified);
      case 'tpo': return students.filter(s => s.isTpcVerified && !s.isTpoVerified);
      default: return [];
    }
  };

  const getVerifiedStudents = () => {
    if (isAllStudentsRoute) return []; // Not used in 'all' view
    switch (verificationType) {
      case 'tpc': return students.filter(s => s.isTpcVerified);
      case 'tpo': return students.filter(s => s.isTpoVerified);
      default: return [];
    }
  };

  const filterStudents = (baseStudents: StudentProfile[]) => {
    return baseStudents.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.email.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesDept = selectedDept === 'all' || s.department === selectedDept;
      const matchesPlacement = selectedPlacement === 'all' ||
        (selectedPlacement === 'placed' && s.isPlaced) ||
        (selectedPlacement === 'not_placed' && !s.isPlaced);

      return matchesSearch && matchesDept && matchesPlacement;
    });
  };

  const pendingStudents = filterStudents(getPendingStudents());
  const verifiedStudents = filterStudents(getVerifiedStudents());
  const allStudentsList = filterStudents(students).filter(s => {
    // Only show fully verified students in the "All Students" view
    return s.isTpcVerified && s.isTpoVerified;
  });

  const handleVerify = async (studentId: string) => {
    try {
      const res = await fetch(`${API_URL}/students/${studentId}/verify`, {
        method: 'PUT',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: verificationType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Verification failed');

      // Update local state optimistically
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          const updated = { ...s };
          if (verificationType === 'tpc') { updated.isTpcVerified = true; updated.verificationStage = 'tpc_verified'; }
          if (verificationType === 'tpo') { updated.isTpoVerified = true; updated.verificationStage = 'tpo_verified'; }
          return updated;
        }
        return s;
      }));

      toast({ title: 'Student Verified ✓', description: 'Profile has been verified successfully.' });
    } catch (err: any) {
      toast({ title: 'Verification failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleReject = async (studentId: string) => {
    const reason = window.prompt("Enter reason for rejection (this will be sent to the student):");
    if (reason === null) return; // cancelled

    try {
      const res = await fetch(`${API_URL}/students/${studentId}/reject`, {
        method: 'PUT',
        headers: { ...getAuthHeader(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: verificationType, reason }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Rejection failed');

      // Update local state to remove from verified/pending accordingly, or push back to pending
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return { ...s, isTpcVerified: false, isTpoVerified: false, verificationStage: 'pending' };
        }
        return s;
      }));

      toast({
        title: 'Verification Rejected',
        description: 'Student has been notified to update their profile.',
        variant: 'destructive',
      });
    } catch (err: any) {
      toast({ title: 'Rejection failed', description: err.message, variant: 'destructive' });
    }
  };

  const handleExportExcel = () => {
    // Determine which list to export based on current tab
    let dataToExport: StudentProfile[] = [];
    let filename = `Students_${selectedYear}_${new Date().toLocaleDateString()}.xlsx`;

    if (isAllStudentsRoute) {
      dataToExport = allStudentsList;
      filename = `All_Students_${selectedYear}_${new Date().toLocaleDateString()}.xlsx`;
    } else {
      if (activeTab === 'pending') {
        dataToExport = pendingStudents;
        filename = `Pending_Verifications_${selectedYear}_${new Date().toLocaleDateString()}.xlsx`;
      } else {
        dataToExport = verifiedStudents;
        filename = `Verified_Students_${selectedYear}_${new Date().toLocaleDateString()}.xlsx`;
      }
    }

    if (dataToExport.length === 0) {
      toast({ title: 'No data to export', description: 'The current list is empty.', variant: 'destructive' });
      return;
    }

    // Format data for Excel
    const worksheetData = dataToExport.map(s => ({
      'Name': s.name,
      'Email': s.email,
      'Department': s.department,
      'CGPA': s.cgpa,
      'Backlogs': s.backlogs,
      '10th %': s.class_10_percentage || 'N/A',
      '12th/Diploma %': s.class_12_percentage || s.diploma_percentage || 'N/A',
      'Status': s.isPlaced ? `Placed @ ${s.placedCompany}` : 'Not Placed',
      'TPC Verified': s.isTpcVerified ? 'Yes' : 'No',
      'TPO Verified': s.isTpoVerified ? 'Yes' : 'No'
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
    
    // Aesthetic: Auto-size columns
    const max_width = worksheetData.reduce((w, r) => Math.max(w, String(r.Name).length), 10);
    worksheet['!cols'] = [{ wch: max_width + 5 }];

    XLSX.writeFile(workbook, filename);
    toast({ title: 'Report Exported!', description: 'Excel file has been downloaded.' });
  };

  const getTitle = () => {
    if (isAllStudentsRoute) return 'All Students';
    switch (verificationType) {
      case 'tpc': return 'TPC Verification';
      case 'tpo': return 'Final Verification';
      default: return 'Student Verification';
    }
  };

  useEffect(() => {
    if (isAllStudentsRoute) {
      setActiveTab('all');
    } else {
      setActiveTab('pending');
    }
  }, [isAllStudentsRoute]);

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{getTitle()}</h1>
            <p className="text-muted-foreground">Review and verify student profiles</p>
          </div>
          <Button 
            variant="outline" 
            className="gap-2 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-700 border-none h-9"
            onClick={handleExportExcel}
          >
            <Download className="h-4 w-4" />
            <span className="hidden sm:inline">Export Excel</span>
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-card"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Select value={selectedDept} onValueChange={setSelectedDept}>
              <SelectTrigger className="w-[180px] bg-card">
                <div className="flex items-center gap-2">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <SelectValue placeholder="Department" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Departments</SelectItem>
                {departments.map(dept => (
                  <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedPlacement} onValueChange={setSelectedPlacement}>
              <SelectTrigger className="w-[160px] bg-card">
                <SelectValue placeholder="Placement Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="placed">Placed</SelectItem>
                <SelectItem value="not_placed">Not Placed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
            <TabsList>
              {!isAllStudentsRoute ? (
                <>
                  <TabsTrigger value="pending" className="gap-2">
                    <Users className="h-4 w-4" />
                    Pending
                    <Badge variant="secondary">{filterStudents(getPendingStudents()).length}</Badge>
                  </TabsTrigger>
                  <TabsTrigger value="verified" className="gap-2">
                    Verified
                    <Badge variant="secondary">{filterStudents(getVerifiedStudents()).length}</Badge>
                  </TabsTrigger>
                </>
              ) : (
                <TabsTrigger value="all" className="gap-2">
                  <Users className="h-4 w-4" />
                  All Students
                  <Badge variant="secondary">{allStudentsList.length}</Badge>
                </TabsTrigger>
              )}
            </TabsList>

            {!isAllStudentsRoute && (
              <>
                <TabsContent value="pending" className="mt-6">
                  <div className="grid gap-4 grid-cols-1">
                    {pendingStudents.map((student) => (
                      <StudentVerificationCard
                        key={student.id}
                        student={student}
                        verificationType={verificationType}
                        onVerify={handleVerify}
                        onReject={handleReject}
                      />
                    ))}
                  </div>
                  {pendingStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium text-foreground">No pending verifications</h3>
                      <p className="text-muted-foreground">All students have been verified</p>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="verified" className="mt-6">
                  <div className="grid gap-4 grid-cols-1">
                    {verifiedStudents.map((student) => (
                      <StudentVerificationCard
                        key={student.id}
                        student={student}
                        verificationType={verificationType}
                        onVerify={handleVerify}
                      />
                    ))}
                  </div>
                  {verifiedStudents.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <h3 className="text-lg font-medium text-foreground">No verified students</h3>
                      <p className="text-muted-foreground">Start verifying students from the pending tab</p>
                    </div>
                  )}
                </TabsContent>
              </>
            )}

            {isAllStudentsRoute && (
              <TabsContent value="all" className="mt-6">
                <div className="grid gap-4 grid-cols-1">
                  {allStudentsList.map((student) => (
                    <StudentVerificationCard
                      key={student.id}
                      student={student}
                      verificationType={verificationType}
                      onVerify={handleVerify}
                      onReject={handleReject}
                    />
                  ))}
                </div>
                {allStudentsList.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-12">
                    <Users className="h-12 w-12 text-muted-foreground/50 mb-4" />
                    <h3 className="text-lg font-medium text-foreground">No students found</h3>
                    <p className="text-muted-foreground">Try adjusting your search or filters</p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
