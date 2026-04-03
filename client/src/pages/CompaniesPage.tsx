import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Search, Building2, Globe, ExternalLink, Loader2, Plus, Pencil, Trash2, Ban, CheckCircle, Save, X } from 'lucide-react';
import { Label } from '@/components/ui/label';

interface Company {
    company_id: number;
    name: string;
    website: string | null;
    is_blacklisted: boolean;
}

export default function CompaniesPage() {
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [companies, setCompanies] = useState<Company[]>([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    
    // Form state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);
    const [formData, setFormData] = useState({ name: '', website: '' });

    useEffect(() => {
        fetchCompanies();
    }, []);

    const fetchCompanies = async () => {
        try {
            setLoading(true);
            const data = await api.get('/companies');
            setCompanies(Array.isArray(data) ? data : []);
        } catch (error: any) {
            console.error('Error fetching companies:', error);
            toast({
                title: 'Error',
                description: 'Failed to load companies. Please try again.',
                variant: 'destructive',
            });
            setCompanies([]);
        } finally {
            setLoading(false);
        }
    };

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name.trim()) return;

        try {
            setSubmitting(true);
            let websitePath = formData.website.trim();
            if (websitePath && !websitePath.startsWith('http')) {
                websitePath = `https://${websitePath}`;
            }

            if (editingCompany) {
                // Update
                const payload = { ...editingCompany, name: formData.name, website: websitePath };
                await api.put(`/companies/${editingCompany.company_id}`, payload);
                toast({ title: 'Success', description: 'Company updated successfully' });
            } else {
                // Create
                await api.post('/companies', { name: formData.name, website: websitePath });
                toast({ title: 'Success', description: 'New company added' });
            }

            closeForm();
            fetchCompanies();
        } catch (error: any) {
            toast({ title: 'Error', description: error.message || 'Operation failed', variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const toggleBlacklist = async (company: Company) => {
        try {
            const payload = { ...company, is_blacklisted: !company.is_blacklisted };
            await api.put(`/companies/${company.company_id}`, payload);
            
            setCompanies(prev => prev.map(c => c.company_id === company.company_id ? payload : c));
            
            toast({ 
                title: payload.is_blacklisted ? 'Company Blacklisted' : 'Company Whitelisted', 
                description: `${company.name} has been ${payload.is_blacklisted ? 'blacklisted' : 'marked as active'}.` 
            });
        } catch (error: any) {
            toast({ title: 'Error', description: 'Failed to update status', variant: 'destructive' });
        }
    };

    const handleDelete = async (id: number, name: string) => {
        if (!confirm(`Are you sure you want to delete ${name}? This cannot be undone.`)) return;
        
        try {
            await api.delete(`/companies/${id}`);
            setCompanies(prev => prev.filter(c => c.company_id !== id));
            toast({ title: 'Deleted', description: 'Company deleted successfully' });
        } catch (error: any) {
            toast({ title: 'Delete Failed', description: error.message || 'Company might have active job postings.', variant: 'destructive' });
        }
    };

    const openEditForm = (company: Company) => {
        setEditingCompany(company);
        setFormData({ name: company.name, website: company.website || '' });
        setIsFormOpen(true);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const openCreateForm = () => {
        setEditingCompany(null);
        setFormData({ name: '', website: '' });
        setIsFormOpen(true);
    };

    const closeForm = () => {
        setIsFormOpen(false);
        setEditingCompany(null);
        setFormData({ name: '', website: '' });
    };

    const filteredCompanies = companies.filter((company) =>
        company.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Companies Directory</h1>
                        <p className="text-muted-foreground">Manage and track companies visiting our campus</p>
                    </div>
                    {!isFormOpen && (
                        <Button onClick={openCreateForm} className="gap-2">
                            <Plus className="h-4 w-4" /> Add Company
                        </Button>
                    )}
                </div>

                {isFormOpen && (
                    <Card className="border-primary/20 shadow-md">
                        <CardHeader className="pb-3 border-b">
                            <CardTitle className="text-lg">
                                {editingCompany ? `Edit Settings: ${editingCompany.name}` : 'Register New Company'}
                            </CardTitle>
                        </CardHeader>
                        <form onSubmit={handleFormSubmit}>
                            <CardContent className="pt-4 grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label>Company Name *</Label>
                                    <Input 
                                        placeholder="e.g. Google, TCS, Infosys" 
                                        value={formData.name} 
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Website (Optional)</Label>
                                    <Input 
                                        placeholder="e.g. https://example.com" 
                                        value={formData.website} 
                                        onChange={(e) => setFormData({...formData, website: e.target.value})}
                                    />
                                </div>
                            </CardContent>
                            <CardFooter className="bg-muted/30 pt-4 flex justify-end gap-2 border-t">
                                <Button type="button" variant="ghost" onClick={closeForm}>
                                    <X className="h-4 w-4 mr-2" /> Cancel
                                </Button>
                                <Button type="submit" disabled={submitting}>
                                    {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    <Save className="h-4 w-4 mr-2" /> Save Company
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>
                )}

                {/* Filters */}
                <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            placeholder="Search companies by name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 bg-background"
                        />
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="gap-1">
                        <Building2 className="h-3.5 w-3.5" />
                        {filteredCompanies.length} companies
                    </Badge>
                </div>

                {/* Companies Grid */}
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredCompanies.map((company) => (
                        <Card key={company.company_id} className={`transition-all hover:shadow-md ${company.is_blacklisted ? 'opacity-75 border-red-200 bg-red-50/10' : ''}`}>
                            <CardContent className="p-5 flex flex-col h-full">
                                <div className="flex justify-between items-start gap-3 mb-2">
                                    <div className="flex items-center gap-3 w-[80%]">
                                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0 ${company.is_blacklisted ? 'bg-red-100' : 'bg-primary/10'}`}>
                                            <Building2 className={`h-5 w-5 ${company.is_blacklisted ? 'text-red-500' : 'text-primary'}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-semibold text-foreground truncate" title={company.name}>
                                                {company.name}
                                            </h3>
                                            {company.is_blacklisted ? (
                                                <Badge variant="destructive" className="mt-1 text-[10px] uppercase h-4 px-1 flex w-fit">Blacklisted</Badge>
                                            ) : (
                                                <Badge variant="outline" className="mt-1 text-green-600 border-green-200 bg-green-50 text-[10px] uppercase h-4 px-1 flex w-fit">Active Recruiter</Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50" onClick={() => openEditForm(company)}>
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(company.company_id, company.name)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="mt-auto pt-3 flex items-center justify-between border-t border-border/50">
                                    <div className="flex-1 truncate pr-2">
                                        {company.website ? (
                                            <a
                                                href={company.website}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors hover:underline truncate"
                                            >
                                                <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                                                <span className="truncate">{company.website.replace(/^https?:\/\//, '')}</span>
                                            </a>
                                        ) : (
                                            <span className="text-xs text-muted-foreground italic flex items-center gap-1.5">
                                                <Globe className="h-3.5 w-3.5 opacity-40 shrink-0" /> No website provided
                                            </span>
                                        )}
                                    </div>
                                    <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className={`h-7 px-2 text-xs flex-shrink-0 ${company.is_blacklisted ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-orange-600 border-orange-200 hover:bg-orange-50'}`}
                                        onClick={() => toggleBlacklist(company)}
                                    >
                                        {company.is_blacklisted ? (
                                            <><CheckCircle className="h-3 w-3 mr-1" /> Whitelist</>
                                        ) : (
                                            <><Ban className="h-3 w-3 mr-1" /> Blacklist</>
                                        )}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {filteredCompanies.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 text-center bg-card rounded-lg border border-dashed border-border mt-4">
                        <Building2 className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <h3 className="text-lg font-medium text-foreground">No companies found</h3>
                        <p className="text-muted-foreground text-sm max-w-sm mt-1 mb-4">
                            {searchQuery ? 'Try adjusting your search query.' : 'Get started by adding recruiting companies to your directory.'}
                        </p>
                        {!searchQuery && (
                            <Button onClick={openCreateForm}>
                                <Plus className="h-4 w-4 mr-2" /> Add First Company
                            </Button>
                        )}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}
