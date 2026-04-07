import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft, Download, CheckCircle, XCircle, FileSpreadsheet } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';

interface Candidate {
    app_id: number;
    application_status: string;
    applied_at: string;
    student_id: number;
    enrollment_no: string;
    cgpa: string;
    active_backlogs: number;
    is_placed: boolean;
    name: string;
    email: string;
    department: string;
}

interface JobDetails {
    job_id: number;
    title: string;
    company_name: string;
    selection_process: string[] | string;
}

export default function JobCandidatesPage() {
    const { jobId } = useParams();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState<Candidate[]>([]);
    const [jobDetails, setJobDetails] = useState<JobDetails | null>(null);
    const [selectedRows, setSelectedRows] = useState<number[]>([]);
    const [bulkStatus, setBulkStatus] = useState<string>('');
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        fetchData();
    }, [jobId]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [jobRes, candidatesRes] = await Promise.all([
                api.get(`/jobs/${jobId}`),
                api.get(`/jobs/${jobId}/candidates`)
            ]);
            setJobDetails(jobRes);
            setCandidates(Array.isArray(candidatesRes) ? candidatesRes : []);
        } catch (error: any) {
            toast({ title: 'Error', description: 'Failed to load data', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const getSelectionProcess = (): string[] => {
        if (!jobDetails || !jobDetails.selection_process) return ['Applied', 'Shortlisted', 'Rejected', 'Placed'];
        try {
            if (Array.isArray(jobDetails.selection_process)) return jobDetails.selection_process;
            return JSON.parse(jobDetails.selection_process);
        } catch {
            return typeof jobDetails.selection_process === 'string' 
                ? jobDetails.selection_process.split(',').map(s => s.trim()) 
                : ['Applied', 'Shortlisted', 'Rejected', 'Placed'];
        }
    };

    const rounds = getSelectionProcess();
    // Ensure Rejected is an option
    if (!rounds.includes('Rejected')) rounds.push('Rejected');

    const handleSelectRow = (appId: number) => {
        setSelectedRows(prev => 
            prev.includes(appId) ? prev.filter(id => id !== appId) : [...prev, appId]
        );
    };

    const handleSelectAll = () => {
        if (selectedRows.length === candidates.length) {
            setSelectedRows([]);
        } else {
            setSelectedRows(candidates.map(c => c.app_id));
        }
    };

    const handleBulkUpdate = async () => {
        if (!bulkStatus || selectedRows.length === 0) return;
        
        try {
            setUpdating(true);
            // Parallel updates
            await Promise.all(
                selectedRows.map(appId => 
                    api.put(`/applications/${appId}`, { status: bulkStatus })
                )
            );
            toast({ title: 'Success', description: `Updated ${selectedRows.length} candidates to ${bulkStatus}` });
            setSelectedRows([]);
            setBulkStatus('');
            fetchData();
        } catch (error: any) {
            toast({ title: 'Update Error', description: error.message || 'Operation failed', variant: 'destructive' });
        } finally {
            setUpdating(false);
        }
    };

    const handleExport = () => {
        const exportData = candidates.map(c => ({
            'College ID': c.enrollment_no || '—',
            'Candidate Name': c.name,
            'Email': c.email,
            'Department': c.department,
            'CGPA': c.cgpa || '—',
            'Active Backlogs': c.active_backlogs || 0,
            'Current Route Stage': c.application_status
        }));
        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Candidates');
        XLSX.writeFile(wb, `${jobDetails?.company_name}_Candidates.xlsx`);
        toast({ title: 'Exported', description: 'Candidates list downloaded.' });
    };

    if (loading) return (
        <DashboardLayout>
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link to="/manage-jobs"><ArrowLeft className="h-4 w-4" /></Link>
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Manage Candidates</h1>
                        {jobDetails && (
                            <p className="text-muted-foreground">
                                {jobDetails.title} at {jobDetails.company_name}
                            </p>
                        )}
                    </div>
                </div>

                <Card>
                    <CardHeader className="flex flex-col md:flex-row md:items-center justify-between pb-4 gap-4">
                        <div>
                            <CardTitle>Applications ({candidates.length})</CardTitle>
                            <CardDescription>Select candidates to advance them through the hiring process.</CardDescription>
                        </div>
                        
                        <div className="flex flex-col sm:flex-row gap-2 items-center">
                            {selectedRows.length > 0 && (
                                <div className="flex items-center gap-2 bg-muted/50 p-1.5 rounded-md border text-sm">
                                    <Badge variant="secondary">{selectedRows.length} selected</Badge>
                                    <Select value={bulkStatus} onValueChange={setBulkStatus}>
                                        <SelectTrigger className="w-[180px] h-8 text-xs bg-card">
                                            <SelectValue placeholder="Move to Round..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rounds.map(round => (
                                                <SelectItem key={round} value={round}>{round}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" className="h-8 px-3" onClick={handleBulkUpdate} disabled={updating || !bulkStatus}>
                                        {updating ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Apply'}
                                    </Button>
                                </div>
                            )}
                            <Button variant="outline" size="sm" onClick={handleExport} disabled={candidates.length === 0} className="ml-auto">
                                <FileSpreadsheet className="h-4 w-4 mr-2" /> Export to Excel
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto border-t">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30">
                                        <TableHead className="w-[40px] pl-4">
                                            <Checkbox 
                                                checked={selectedRows.length === candidates.length && candidates.length > 0}
                                                onCheckedChange={handleSelectAll}
                                            />
                                        </TableHead>
                                        <TableHead>College ID</TableHead>
                                        <TableHead>Candidate</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>CGPA</TableHead>
                                        <TableHead>Current Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {candidates.map(candidate => (
                                        <TableRow key={candidate.app_id} className="hover:bg-muted/30">
                                            <TableCell className="pl-4">
                                                <Checkbox 
                                                    checked={selectedRows.includes(candidate.app_id)}
                                                    onCheckedChange={() => handleSelectRow(candidate.app_id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{candidate.enrollment_no || '—'}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-sm">{candidate.name}</span>
                                                    <span className="text-xs text-muted-foreground">{candidate.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{candidate.department}</TableCell>
                                            <TableCell>
                                                <span className={`font-semibold ${parseFloat(candidate.cgpa) >= 7.5 ? 'text-green-600' : ''}`}>
                                                    {candidate.cgpa || '—'}
                                                </span>
                                                {candidate.active_backlogs > 0 && (
                                                    <Badge variant="destructive" className="ml-2 text-[10px] h-4">BL: {candidate.active_backlogs}</Badge>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge
                                                    variant={candidate.application_status.toLowerCase() === 'placed' ? 'default' : 
                                                             candidate.application_status.toLowerCase() === 'rejected' ? 'destructive' : 'secondary'}
                                                    className="uppercase text-[10px]"
                                                >
                                                    {candidate.application_status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {candidates.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                                No candidates have applied for this job yet.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
