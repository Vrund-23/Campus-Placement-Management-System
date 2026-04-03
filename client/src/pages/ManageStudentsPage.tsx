import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  RefreshCcw, 
  CheckCircle, 
  Loader2, 
  Mail, 
  FileSpreadsheet,
  AlertCircle,
  Upload,
  FileUp,
  Download
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { useAcademicYear } from '@/contexts/AcademicYearContext';

export default function ManageStudentsPage() {
  const { toast } = useToast();
  const { selectedYear, isPastYear: checkIsPast } = useAcademicYear();
  const isPastYear = checkIsPast(selectedYear);
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [syncResults, setSyncResults] = useState<any>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/student-management?academicYear=${selectedYear}`);
      setStudents(data);
    } catch (err: any) {
      toast({ title: 'Failed to load students', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, [selectedYear]);

  const handleSyncExcel = async () => {
    try {
      setSyncing(true);
      setSyncResults(null);
      const data = await api.post('/student-management/sync', { academicYear: selectedYear });
      
      const created = data.results.filter((r: any) => r.status === 'created').length;
      const updated = data.results.filter((r: any) => r.status === 'updated').length;
      
      setSyncResults(data);
      toast({ 
        title: 'Sync Complete', 
        description: `Successfully added ${created} and updated ${updated} students.` 
      });
      
      fetchStudents();
    } catch (err: any) {
      toast({ 
        title: 'Sync Failed', 
        description: err.message || 'Make sure the Excel file exists in server/data/students/', 
        variant: 'destructive' 
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        setSelectedFile(file);
      } else {
        toast({ title: 'Invalid File', description: 'Please select a valid Excel file (.xlsx or .xls)', variant: 'destructive' });
      }
    }
  };

  const handleUploadAndSync = async () => {
    if (!selectedFile) {
      toast({ title: 'No file selected', description: 'Please choose an Excel file first.', variant: 'destructive' });
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', selectedFile);

      // 1. Upload
      await api.postFormData(`/student-management/upload?academicYear=${selectedYear}`, formData);

      toast({ title: 'Upload Successful', description: 'Excel replaced. Starting data sync...' });

      // 2. Sync
      await handleSyncExcel();
      
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      toast({ title: 'Operation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };



    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-black text-foreground">Faculty Student Sync</h1>
              <p className="text-muted-foreground">Onboard students from your department's Excel file in one click</p>
            </div>
            {!isPastYear && (
              <div className="flex gap-3">
                <Button 
                    variant="outline"
                    onClick={handleSyncExcel} 
                    disabled={syncing || uploading}
                    className="gap-2"
                  >
                    {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                    Sync Existing
                </Button>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept=".xlsx,.xls"
                  className="hidden"
                />
                <Button 
                  onClick={() => fileInputRef.current?.click()} 
                  variant="secondary"
                  className="gap-2"
                >
                  <FileUp className="h-4 w-4" />
                  {selectedFile ? selectedFile.name.substring(0, 15) + '...' : 'Pick New Excel'}
                </Button>
                {selectedFile && (
                  <Button 
                    onClick={handleUploadAndSync} 
                    disabled={uploading}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    Upload & Sync
                  </Button>
                )}
              </div>
            )}
          </div>
  
          {syncResults && (
          <Card className="border-emerald-200 bg-emerald-50/10 dark:bg-emerald-950/10 dark:border-emerald-900/30">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle className="h-5 w-5" />
                <CardTitle className="text-lg">Last Sync Results: {syncResults.department}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 rounded-full">
                  <span className="font-bold">{syncResults.results.filter((r: any) => r.status === 'created').length}</span> Added
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full">
                  <span className="font-bold">{syncResults.results.filter((r: any) => r.status === 'updated').length}</span> Updated
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full">
                  <span className="font-bold">{syncResults.results.filter((r: any) => r.status === 'skipped').length}</span> No Change
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-full">
                  <span className="font-bold">{syncResults.results.filter((r: any) => r.status === 'error').length}</span> Errors
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6">
          <Card className="glass-card">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Department Students</CardTitle>
                  <CardDescription>All students currently registered in your branch</CardDescription>
                </div>
                <Badge variant="secondary" className="px-3 py-1">
                  {students.length} Total
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : students.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border-2 border-dashed border-border rounded-xl">
                  <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center">
                    <FileSpreadsheet className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <div>
                    <h3 className="text-lg font-medium">Ready to sync?</h3>
                    <p className="text-muted-foreground max-w-xs mx-auto">
                      Use the "Pick New Excel" button above to upload your branch student list.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted-foreground text-left">
                        <th className="pb-3 pt-0 font-medium pl-2">Name</th>
                        <th className="pb-3 pt-0 font-medium">College ID</th>
                        <th className="pb-3 pt-0 font-medium">Contact</th>
                        <th className="pb-3 pt-0 font-medium text-right pr-2">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {students.map((student) => (
                        <tr key={student.user_id} className="group hover:bg-muted/30 transition-colors">
                          <td className="py-4 pl-2">
                            <div className="font-semibold text-foreground">{student.name}</div>
                            <div className="text-xs text-muted-foreground flex items-center gap-1">
                              <Mail className="h-3 w-3" /> {student.email}
                            </div>
                          </td>
                          <td className="py-4 font-mono text-xs">
                            {student.enrollment_no || 'N/A'}
                          </td>
                          <td className="py-4 text-muted-foreground">
                            {student.phone_number || 'N/A'}
                          </td>
                          <td className="py-4 text-right pr-2">
                            {student.tpc_verified ? (
                              <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-amber-600">
                                Pending
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-blue-50/50 dark:bg-blue-950/10 border-blue-200 dark:border-blue-900/30">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2 text-blue-600">
                <AlertCircle className="h-5 w-5" />
                <CardTitle className="text-sm">Helpful Instructions & Option A</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="text-xs space-y-2 text-blue-800/80 dark:text-blue-300/70 list-disc pl-4">
                <li>You can now managed everything from the <strong>Pick New Excel</strong> button.</li>
                <li>When you upload a file, it overrides the previous record for your branch.</li>
                <li>Required columns on first sheet: <code>name</code>, <code>college_id</code>, <code>mail_id</code>, <code>mobile_number</code></li>
                <li><strong>Sync to Update</strong>: Changing a student's info in Excel will instantly update their profile on the website after you upload/sync.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
