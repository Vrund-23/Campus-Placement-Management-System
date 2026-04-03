import { useState, useEffect } from 'react';
import { DEPARTMENTS } from '@/constants/departments';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Briefcase, Loader2, Plus, Calendar, Settings as SettingsIcon, AlertCircle, Users, Pencil, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { useAcademicYear } from '@/contexts/AcademicYearContext';

interface Company {
    company_id: number;
    name: string;
}

const BRANCH_OPTIONS = DEPARTMENTS;

interface Job {
    job_id: number;
    title: string;
    company_name: string;
    applications_count: number;
    status: string;
    is_public: boolean;
    min_cgpa: number;
    min_10th_percent: number;
    min_12th_percent: number;
    max_backlogs: number;
    eligible_branches: string[];
    deadline: string;
    selection_process: string[] | string;
}

export default function ManageJobsPage() {
    const { toast } = useToast();
    const { selectedYear } = useAcademicYear();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [editingJobId, setEditingJobId] = useState<number | null>(null);
    const [companies, setCompanies] = useState<Company[]>([]);
    const [jobs, setJobs] = useState<Job[]>([]);

    // Form State
    const [formData, setFormData] = useState({
        company_name: '',
        title: '',
        min_cgpa: '',
        min_10th_percent: '',
        min_12th_percent: '',
        max_backlogs: '',
        deadline: '',
        eligible_branches: [] as string[],
        is_public: true,
        selection_process: 'Applied, Aptitude, Coding Round, Technical Interview, HR Interview, Placed'
    });

    useEffect(() => {
        fetchData();
    }, [selectedYear]);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [companiesRes, jobsRes] = await Promise.all([
                api.get('/companies'),
                api.get(`/jobs/all/admin?academicYear=${selectedYear}`)
            ]);
            setCompanies(companiesRes);
            setJobs(jobsRes);
        } catch (error: any) {
            toast({ title: 'Error loading data', description: error.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleBranchToggle = (branch: string) => {
        setFormData(prev => {
            const current = [...prev.eligible_branches];
            const index = current.indexOf(branch);
            if (index > -1) {
                current.splice(index, 1);
            } else {
                current.push(branch);
            }
            return { ...prev, eligible_branches: current };
        });
    };

    const handleEditClick = (job: Job) => {
        setEditingJobId(job.job_id);

        // Format date for datetime-local input (YYYY-MM-DDThh:mm)
        const date = new Date(job.deadline);
        const deadlineStr = new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);

        // Handle selection process parsing (if it comes as array or string)
        const processStr = Array.isArray(job.selection_process)
            ? job.selection_process.join(', ')
            : typeof job.selection_process === 'string'
                ? JSON.parse(job.selection_process as string).join(', ')
                : '';

        setFormData({
            company_name: job.company_name,
            title: job.title,
            min_cgpa: job.min_cgpa.toString(),
            min_10th_percent: job.min_10th_percent.toString(),
            min_12th_percent: job.min_12th_percent.toString(),
            max_backlogs: job.max_backlogs.toString(),
            deadline: deadlineStr,
            eligible_branches: Array.isArray(job.eligible_branches) ? job.eligible_branches : [],
            is_public: job.is_public,
            selection_process: processStr
        });

        // Scroll to form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const cancelEdit = () => {
        setEditingJobId(null);
        setFormData({
            company_name: '', title: '', min_cgpa: '', min_10th_percent: '', min_12th_percent: '', max_backlogs: '', deadline: '',
            eligible_branches: [],
            is_public: true,
            selection_process: 'Applied, Aptitude, Coding Round, Technical Interview, HR Interview, Placed'
        });
    };

    const handleSubmitForm = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.company_name || !formData.title || !formData.deadline) {
            return toast({ title: 'Missing fields', description: 'Please fill out all required fields.', variant: 'destructive' });
        }

        try {
            setSubmitting(true);

            const parsedProcess = formData.selection_process.split(',').map(s => s.trim()).filter(Boolean);

            const payload = {
                company_name: formData.company_name,
                title: formData.title,
                min_cgpa: parseFloat(formData.min_cgpa) || 0,
                min_10th_percent: parseFloat(formData.min_10th_percent) || 0,
                min_12th_percent: parseFloat(formData.min_12th_percent) || 0,
                max_backlogs: parseInt(formData.max_backlogs) || 0,
                deadline: new Date(formData.deadline).toISOString(),
                eligible_branches: formData.eligible_branches.length > 0 ? formData.eligible_branches : ['All'],
                is_public: formData.is_public,
                selection_process: parsedProcess.length > 0 ? parsedProcess : undefined,
                academic_year: selectedYear
            };

            if (editingJobId) {
                await api.put(`/jobs/${editingJobId}`, payload);
                toast({ title: 'Success', description: 'Job posting updated successfully!' });
            } else {
                await api.post('/jobs', payload);
                toast({ title: 'Success', description: 'Job posting created successfully!' });
            }

            // Reset form & refresh
            cancelEdit();
            fetchData();

        } catch (error: any) {
            toast({ title: editingJobId ? 'Update failed' : 'Creation failed', description: error.message, variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <DashboardLayout>
            <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20 shrink-0 uppercase tracking-widest font-black">Admin Cycle {selectedYear}</Badge>
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Manage Job Drives</h1>
                    <p className="text-muted-foreground">Create and manage upcoming placement drives for the {selectedYear} cycle.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Create/Edit Job Form */}
                    <Card id="job-form" className="shadow-sm border-primary/10">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                {editingJobId ? <Pencil className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5" />}
                                {editingJobId ? "Edit Job Drive" : "Post New Job"}
                            </CardTitle>
                            <CardDescription>
                                {editingJobId ? `Modifying settings for ${formData.company_name}` : "Setup a new recruitment drive round configuration."}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleSubmitForm} className="space-y-4">

                                <div className="space-y-2">
                                    <Label>Company Name *</Label>
                                    <Input name="company_name" placeholder="Enter company name manually" value={formData.company_name} onChange={handleChange} required />
                                </div>

                                <div className="space-y-2">
                                    <Label>Job Title / Role *</Label>
                                    <Input name="title" placeholder="e.g. Software Development Engineer" value={formData.title} onChange={handleChange} required />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Minimum CGPA</Label>
                                        <Input name="min_cgpa" type="number" step="0.01" placeholder="e.g. 7.5" value={formData.min_cgpa} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Max Backlogs</Label>
                                        <Input name="max_backlogs" type="number" placeholder="0" value={formData.max_backlogs} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>10th Min %</Label>
                                        <Input name="min_10th_percent" type="number" step="0.01" placeholder="60" value={formData.min_10th_percent} onChange={handleChange} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>12th/Dip Min %</Label>
                                        <Input name="min_12th_percent" type="number" step="0.01" placeholder="60" value={formData.min_12th_percent} onChange={handleChange} />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Eligible Branches (Select multiple)</Label>
                                    <div className="flex flex-wrap gap-2 p-3 border border-input rounded-md bg-background/50">
                                        {BRANCH_OPTIONS.map(branch => (
                                            <Badge
                                                key={branch}
                                                variant={formData.eligible_branches.includes(branch) ? "default" : "outline"}
                                                className="cursor-pointer py-1 px-3"
                                                onClick={() => handleBranchToggle(branch)}
                                            >
                                                {branch}
                                            </Badge>
                                        ))}
                                        {formData.eligible_branches.length === 0 && (
                                            <span className="text-xs text-muted-foreground italic">Defaults to 'All' if none selected</span>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label>Application Deadline *</Label>
                                    <Input name="deadline" type="datetime-local" value={formData.deadline} onChange={handleChange} required />
                                </div>

                                <div className="space-y-2 pt-2">
                                    <Label className="flex items-center gap-2 text-primary">
                                        <SettingsIcon className="h-4 w-4" /> Custom Selection Process (Rounds)
                                    </Label>
                                    <p className="text-xs text-muted-foreground pb-1">Enter the exact recruitment rounds separated by commas.</p>
                                    <Input
                                        name="selection_process"
                                        value={formData.selection_process}
                                        onChange={handleChange}
                                        className="font-mono text-sm"
                                    />
                                    <div className="bg-muted/50 p-3 rounded text-xs flex gap-2 mt-2 border border-border">
                                        <AlertCircle className="h-4 w-4 shrink-0 text-blue-500" />
                                        <p>This strictly maps what students see in their application tracker. <i>"Applied"</i> and <i>"Placed"</i> should typically sit at the ends of your array.</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {editingJobId && (
                                        <Button type="button" variant="outline" onClick={cancelEdit} className="flex-1">
                                            <X className="h-4 w-4 mr-2" /> Cancel Edit
                                        </Button>
                                    )}
                                    <Button type="submit" className="flex-[2]" disabled={submitting}>
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : (editingJobId ? "Save Changes" : "Publish Job Drive")}
                                    </Button>
                                </div>

                            </form>
                        </CardContent>
                    </Card>

                    {/* Active Jobs List */}
                    <Card className="shadow-sm border-primary/10">
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <div>
                                    <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5" /> Active Job Drives</CardTitle>
                                    <CardDescription>Recently posted opportunities ({jobs.length})</CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2 custom-scrollbar">
                                {jobs.map(job => (
                                    <div key={job.job_id} className="p-4 border border-border rounded-lg bg-card hover:border-primary/40 transition-all hover:bg-muted/30 group">
                                        <div className="flex justify-between items-start mb-2">
                                            <div>
                                                <h3 className="font-bold text-foreground leading-tight group-hover:text-primary transition-colors">{job.title}</h3>
                                                <p className="text-sm font-medium text-muted-foreground mt-0.5">{job.company_name}</p>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Badge variant={job.status === 'OPEN' ? 'default' : 'secondary'} className="px-2 py-0">{job.status}</Badge>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-blue-500 hover:text-blue-600 hover:bg-blue-50 rounded-full"
                                                    onClick={() => handleEditClick(job)}
                                                >
                                                    <Pencil className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>

                                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground border-t border-border/60 pt-3">
                                            <div className="flex items-center gap-3">
                                                <Link to={`/manage-jobs/${job.job_id}/candidates`} className="flex items-center gap-1 hover:text-primary transition-colors cursor-pointer bg-muted/50 px-2 py-1 rounded-md border border-transparent hover:border-primary/20">
                                                    <Users className="h-3.5 w-3.5" /> <span className="font-semibold text-foreground">{job.applications_count}</span> <span className="text-[10px]">Applied</span>
                                                </Link>
                                                <div className="flex items-center gap-1">
                                                    <Calendar className="h-3.5 w-3.5 opacity-60" /> <span>{new Date(job.deadline).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                            {job.is_public && (
                                                <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50 text-[9px] font-bold h-5">LIVE</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))}
                                {jobs.length === 0 && (
                                    <div className="text-center py-12 text-muted-foreground border border-dashed border-border rounded-lg">
                                        <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-10" />
                                        <p className="font-medium">No job postings active yet.</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                </div>
            </div>
        </DashboardLayout>
    );
}
