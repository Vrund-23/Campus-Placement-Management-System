import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import * as XLSX from 'xlsx';
import {
  Upload, Users, Send, CheckCircle, XCircle, AlertTriangle,
  FileSpreadsheet, Trash2, Download, Loader2, Eye, EyeOff, Copy, Check,
  Plus, UserMinus, RefreshCcw
} from 'lucide-react';

interface TPFRow {
  name: string;
  email: string;
  department: string;
  college_id: string;
}

interface TPFResult extends TPFRow {
  status: 'created' | 'skipped' | 'error';
  reason?: string;
  emailSent?: boolean;
  rawPassword?: string;
}

interface ExistingTPF {
  user_id: number;
  name: string;
  email: string;
  college_id: string;
  department_name: string;
}

export default function ManageTPFPage() {
  const { selectedYear, isPastYear: checkIsPast } = useAcademicYear();
  const isPastYear = checkIsPast(selectedYear);
  
  const [existingTPFs, setExistingTPFs] = useState<ExistingTPF[]>([]);
  const [uploadedRows, setUploadedRows] = useState<TPFRow[]>([]);
  const [results, setResults] = useState<TPFResult[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [fileName, setFileName] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchExistingTPFs();
  }, [selectedYear]);

  const fetchExistingTPFs = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/tpf-management?academicYear=${selectedYear}`);
      setExistingTPFs(data);
    } catch (err: any) {
      console.error('Failed to fetch TPFs:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setFileName(file.name);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      const data = evt.target?.result;
      const workbook = XLSX.read(data, { type: 'binary' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<any>(sheet);

      // Map Excel columns (flexible header matching)
      const rows: TPFRow[] = json.map((row: any) => ({
        name: row['Name'] || row['name'] || row['Full Name'] || row['NAME'] || '',
        email: row['Email'] || row['email'] || row['EMAIL'] || row['Mail'] || '',
        department: row['Department'] || row['department'] || row['DEPARTMENT'] || row['Dept'] || row['Branch'] || '',
        college_id: row['College ID'] || row['college_id'] || row['College_ID'] || row['Employee Code'] || row['ID'] || '',
      })).filter((r: TPFRow) => r.name && r.email);

      if (rows.length === 0) {
        toast({ title: 'No valid rows found', description: 'Make sure your Excel has Name & Email columns.', variant: 'destructive' });
        return;
      }

      setUploadedRows(rows);
      toast({ title: `${rows.length} TPF(s) loaded`, description: 'Review the list below and click "Create & Send Emails".' });
    };
    reader.readAsBinaryString(file);
  };

  const handleSyncExcel = async () => {
    try {
      setSyncing(true);
      setResults(null);
      const res = await api.post('/tpf-management/sync', { academicYear: selectedYear });
      setResults(res.results);
      
      const created = res.results.filter((r: any) => r.status === 'created').length;
      const updated = res.results.filter((r: any) => r.status === 'updated').length;
      
      toast({ 
        title: 'Sync Complete', 
        description: `Successfully created ${created} and updated ${updated} TPFs.` 
      });
      fetchExistingTPFs();
    } catch (err: any) {
      toast({ 
        title: 'Sync Failed', 
        description: err.message || 'Make sure the Excel file is uploaded for this year.', 
        variant: 'destructive' 
      });
    } finally {
      setSyncing(false);
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
      await api.postFormData(`/tpf-management/upload?academicYear=${selectedYear}`, formData);

      toast({ title: 'Upload Successful', description: 'Excel replaced. Starting data sync...' });

      // 2. Sync
      await handleSyncExcel();
      
      setSelectedFile(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: any) {
      toast({ title: 'Operation Failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
    }
  };

  const handleSendAll = async () => {
    if (uploadedRows.length === 0) return;
    try {
      setSending(true);
      const res = await api.post('/tpf-management/bulk', { 
        tpfs: uploadedRows,
        academicYear: selectedYear
      });
      setResults(res.results);
      const created = res.results.filter((r: TPFResult) => r.status === 'created').length;
      const skipped = res.results.filter((r: TPFResult) => r.status === 'skipped').length;
      toast({
        title: `${created} TPF(s) created`,
        description: skipped > 0 ? `${skipped} were skipped (already exist or invalid).` : 'All accounts created successfully!',
      });
      fetchExistingTPFs();
    } catch (err: any) {
      toast({ title: 'Bulk creation failed', description: err.message, variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  const clearUpload = () => {
    setUploadedRows([]);
    setResults(null);
    setFileName('');
    setShowPasswords(false);
    if (fileRef.current) fileRef.current.value = '';
  };

  const handleAddMore = () => {
    clearUpload();
    // Trigger file picker after a tick so state is clean
    setTimeout(() => fileRef.current?.click(), 50);
  };

  const handleDeleteTPF = async (tpf: ExistingTPF) => {
    try {
      setDeletingId(tpf.user_id);
      await api.delete(`/tpf-management/${tpf.user_id}`);
      toast({
        title: 'TPF removed',
        description: `${tpf.name} has been removed from the system.`,
      });
      setExistingTPFs(prev => prev.filter(t => t.user_id !== tpf.user_id));
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast({
        title: 'Failed to remove TPF',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setDeletingId(null);
    }
  };

  const copyPassword = (pw: string, idx: number) => {
    navigator.clipboard.writeText(pw);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['Name', 'Email', 'Department', 'College ID'],
      ['Prof. Sharma', 'sharma@college.edu', 'Computer', 'FAC-001'],
      ['Prof. Patel', 'patel@college.edu', 'IT', 'FAC-002'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'TPFs');
    XLSX.writeFile(wb, 'TPF_Template.xlsx');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" /> Manage TPFs
            </h1>
            <p className="text-muted-foreground">Upload an Excel file with TPF details, review, and send login credentials.</p>
          </div>
          <div className="flex gap-3">
            <Button 
                variant="outline" 
                className="gap-2" 
                onClick={handleSyncExcel}
                disabled={syncing || uploading}
              >
                {syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                Sync Existing
            </Button>
            <Button variant="outline" className="gap-2" onClick={downloadTemplate}>
              <Download className="h-4 w-4" /> Download Template
            </Button>
          </div>
        </div>

        {/* Upload Section */}
        {!isPastYear && (
          <Card className="border-dashed border-2 border-primary/20 hover:border-primary/40 transition-colors">
          <CardContent className="pt-6">
            {uploadedRows.length === 0 && !results ? (
              <div
                className="flex flex-col items-center justify-center py-12 cursor-pointer"
                onClick={() => fileRef.current?.click()}
              >
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Upload TPF Excel File</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Columns: <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Name</code>,{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Email</code>,{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">Department</code>,{' '}
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs">College ID</code>
                </p>
                <Button variant="outline" className="gap-2">
                  <Upload className="h-4 w-4" /> Choose File
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>
            ) : (
              <div className="space-y-4">
                {/* File info bar */}
                <div className="flex items-center justify-between bg-muted/50 rounded-lg px-4 py-2">
                  <div className="flex items-center gap-2 text-sm">
                    <FileSpreadsheet className="h-4 w-4 text-primary" />
                    <span className="font-medium">{fileName}</span>
                    <Badge variant="secondary">{uploadedRows.length} TPFs</Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    {results && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setShowPasswords(!showPasswords)}>
                        {showPasswords ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                        {showPasswords ? 'Hide' : 'Show'} Passwords
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={clearUpload}>
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>

                {/* Preview / Results Table */}
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="px-4 py-3 font-medium">#</th>
                        <th className="px-4 py-3 font-medium">Name</th>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Department</th>
                        <th className="px-4 py-3 font-medium">College ID</th>
                        {results && <th className="px-4 py-3 font-medium">Status</th>}
                        {results && showPasswords && <th className="px-4 py-3 font-medium">Password</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {(results || uploadedRows).map((row, idx) => {
                        const r = row as TPFResult;
                        return (
                          <tr key={idx} className="hover:bg-muted/20 transition-colors">
                            <td className="px-4 py-3 text-muted-foreground">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium">{row.name}</td>
                            <td className="px-4 py-3 text-muted-foreground">{row.email}</td>
                            <td className="px-4 py-3">{row.department}</td>
                            <td className="px-4 py-3 font-mono text-xs">{row.college_id || '—'}</td>
                            {results && (
                              <td className="px-4 py-3">
                                {r.status === 'created' ? (
                                  <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 gap-1">
                                    <CheckCircle className="h-3 w-3" /> Created
                                    {r.emailSent && ' & Emailed'}
                                  </Badge>
                                ) : r.status === 'skipped' ? (
                                  <Badge variant="outline" className="text-amber-600 border-amber-300 gap-1">
                                    <AlertTriangle className="h-3 w-3" /> {r.reason}
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive" className="gap-1">
                                    <XCircle className="h-3 w-3" /> {r.reason}
                                  </Badge>
                                )}
                              </td>
                            )}
                            {results && showPasswords && (
                              <td className="px-4 py-3">
                                {r.rawPassword ? (
                                  <div className="flex items-center gap-1">
                                    <code className="bg-muted px-2 py-0.5 rounded text-xs font-mono">{r.rawPassword}</code>
                                    <button onClick={() => copyPassword(r.rawPassword!, idx)} className="p-1 hover:bg-muted rounded">
                                      {copiedIdx === idx ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  {results ? (
                    /* After creation: show "Add More TPFs" button */
                    <Button variant="outline" className="gap-2" onClick={handleAddMore}>
                      <Plus className="h-4 w-4" /> Add More TPFs
                    </Button>
                  ) : (
                    /* Before creation: show the upload & sync button */
                    <>
                      <Button variant="outline" onClick={clearUpload} disabled={uploading}>
                        Cancel
                      </Button>
                      <Button className="gap-2 bg-emerald-600 hover:bg-emerald-700 shadow-lg text-white font-bold" onClick={handleUploadAndSync} disabled={uploading}>
                        {uploading ? (
                          <><Loader2 className="h-4 w-4 animate-spin" /> Uploading & Syncing...</>
                        ) : (
                          <><Upload className="h-4 w-4" /> Upload & Sync TPF List</>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
        )}

        {/* Existing TPFs Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Active TPFs</CardTitle>
                <CardDescription>{existingTPFs.length} coordinator{existingTPFs.length !== 1 ? 's' : ''} registered</CardDescription>
              </div>
              {existingTPFs.length > 0 && !isPastYear && (
                <Button variant="outline" size="sm" className="gap-2" onClick={handleAddMore}>
                  <Plus className="h-4 w-4" /> Add More
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => <div key={i} className="h-14 rounded-lg bg-muted/50 animate-pulse" />)}
              </div>
            ) : existingTPFs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                <p className="font-medium">No TPFs added yet</p>
                <p className="text-sm">Upload an Excel file above to get started.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wider text-muted-foreground">
                      <th className="pb-3 pr-4 font-medium">Name</th>
                      <th className="pb-3 pr-4 font-medium">Email</th>
                      <th className="pb-3 pr-4 font-medium">Department</th>
                      <th className="pb-3 pr-4 font-medium">College ID</th>
                      <th className="pb-3 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {existingTPFs.map((tpf) => (
                      <tr key={tpf.user_id} className="hover:bg-muted/30 transition-colors group">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {tpf.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="font-medium">{tpf.name}</span>
                          </div>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{tpf.email}</td>
                        <td className="py-3 pr-4"><Badge variant="secondary">{tpf.department_name}</Badge></td>
                        <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{tpf.college_id || '—'}</td>
                        <td className="py-3 text-right">
                          {confirmDeleteId === tpf.user_id ? (
                            <div className="flex items-center justify-end gap-2">
                              <span className="text-xs text-muted-foreground mr-1">Remove?</span>
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-7 px-2 text-xs gap-1"
                                disabled={deletingId === tpf.user_id}
                                onClick={() => handleDeleteTPF(tpf)}
                              >
                                {deletingId === tpf.user_id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <>
                                    <UserMinus className="h-3 w-3" /> Yes
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 text-xs"
                                onClick={() => setConfirmDeleteId(null)}
                              >
                                No
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                              onClick={() => setConfirmDeleteId(tpf.user_id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
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
      </div>
    </DashboardLayout>
  );
}
