import { useState } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { usePlacementStats } from '@/contexts/PlacementStatsContext';
import { Upload, Save, FileSpreadsheet, CalendarDays, Loader2, ShieldCheck, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '@/lib/api'; 
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminSettingsPage() {
    const { data, refresh } = usePlacementStats();
    const [stats, setStats] = useState(data.stats);
    const [isUploading, setIsUploading] = useState(false);
    const [newYear, setNewYear] = useState('');
    const [isInitializing, setIsInitializing] = useState(false);
    const [password, setPassword] = useState('');
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);
    const [isAgreed, setIsAgreed] = useState(false);

    // Handler for manual input changes
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setStats(prev => ({
            ...prev,
            [name]: parseInt(value) || 0
        }));
    };

    const handleSaveStats = () => {
        // In this implementation, stats are calculated dynamically by the backend
        // based on student and job data. Manual overrides are currently not persisted.
        toast.info('Note: Global statistics are automatically calculated from active records.');
    };

    // Mock file upload handler
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // Simulate parsing and uploading
        setTimeout(() => {
            setIsUploading(false);
            toast.success(`Successfully processed ${file.name}`);
            // In a real app, we would parse the Excel/CSV here and update state
        }, 1500);
    };

    const handleInitYear = async () => {
        if (!password) {
            toast.error('Password is required for confirmation.');
            return;
        }

        try {
            setIsInitializing(true);
            const res = await api.post('/admin-settings/init-year', { 
                academicYear: newYear,
                password: password 
            });
            toast.success(res.message);
            setNewYear('');
            setPassword('');
            setIsConfirmOpen(false);
            setIsAgreed(false);
        } catch (err: any) {
            toast.error(err.message || 'Verification failed. Please check your password.');
        } finally {
            setIsInitializing(false);
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-8 animate-in fade-in duration-500">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
                    <p className="text-muted-foreground">Manage application configurations and data</p>
                </div>

                <div className="max-w-4xl mx-auto space-y-6">
                    {/* Academic Year Management */}
                    <Card className="border-emerald-100 bg-emerald-50/5">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-emerald-800">
                                <CalendarDays className="h-5 w-5" />
                                Academic Year Management
                            </CardTitle>
                            <CardDescription>Initialize a new academic year batch and create necessary server directories</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="newYear">New Academic Year</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="newYear"
                                        placeholder="e.g. 2026-27"
                                        value={newYear}
                                        onChange={(e) => setNewYear(e.target.value)}
                                        className="border-emerald-200 focus-visible:ring-emerald-500"
                                    />
                                    
                                    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                                        <AlertDialogTrigger asChild>
                                            <Button 
                                                disabled={!/^\d{4}-\d{2}$/.test(newYear)}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[120px]"
                                            >
                                                Initialize
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent className="max-w-md">
                                            <AlertDialogHeader>
                                                <div className="flex items-center gap-3 text-amber-600 mb-2">
                                                    <AlertTriangle className="h-6 w-6" />
                                                    <AlertDialogTitle>Critical Action: Initialize {newYear}</AlertDialogTitle>
                                                </div>
                                                <AlertDialogDescription className="space-y-4">
                                                    <p className="text-emerald-900/80">
                                                        This will create new folder structures for <strong>{newYear}</strong> TPC, TPF, and Student data. 
                                                        This is a prerequisite for starting a new placement cycle.
                                                    </p>
                                                    
                                                    <div className="space-y-4 pt-2">
                                                        <div className="space-y-2">
                                                            <Label htmlFor="admin-pass" className="text-emerald-900 font-medium">Verify TPO Password</Label>
                                                            <div className="relative">
                                                                <ShieldCheck className="absolute left-3 top-2.5 h-4 w-4 text-emerald-600" />
                                                                <Input 
                                                                    id="admin-pass"
                                                                    type="password"
                                                                    placeholder="Confirm with your account password"
                                                                    className="pl-9 border-emerald-200 focus:border-emerald-400"
                                                                    value={password}
                                                                    onChange={(e) => setPassword(e.target.value)}
                                                                />
                                                            </div>
                                                        </div>

                                                        <div className="flex items-start space-x-3 bg-white p-3 rounded-lg border border-emerald-100 shadow-sm">
                                                            <Checkbox 
                                                                id="agree" 
                                                                checked={isAgreed}
                                                                onCheckedChange={(checked) => setIsAgreed(checked as boolean)}
                                                                className="mt-1 data-[state=checked]:bg-emerald-600 border-emerald-300" 
                                                            />
                                                            <label 
                                                                htmlFor="agree" 
                                                                className="text-xs text-emerald-800 leading-tight cursor-pointer"
                                                            >
                                                                I acknowledge that this action will create new server directories and I am authorized to proceed.
                                                            </label>
                                                        </div>
                                                    </div>
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter className="mt-4">
                                                <AlertDialogCancel onClick={() => { setPassword(''); setIsAgreed(false); }} className="border-emerald-200 hover:bg-emerald-50">Cancel</AlertDialogCancel>
                                                <Button 
                                                    onClick={handleInitYear}
                                                    disabled={!password || !isAgreed || isInitializing}
                                                    className="bg-emerald-600 hover:bg-emerald-700"
                                                >
                                                    {isInitializing ? (
                                                        <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Initializing...</>
                                                    ) : (
                                                        "Confirm & Initialize"
                                                    )}
                                                </Button>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <p className="text-[10px] text-emerald-600/60 mt-1 italic">
                                    Target path: server/data/[Category]/{newYear || "YYYY-YY"}
                                </p>
                            </div>
                            
                            <div className="bg-emerald-900/5 p-4 rounded-xl border border-emerald-100/30 space-y-2">
                                <p className="font-semibold text-emerald-800 text-sm">Deployment Guide:</p>
                                <ul className="space-y-2">
                                    <li className="flex items-start gap-3 text-xs text-emerald-700/90">
                                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                        <span>Initialize folders (current step)</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-xs text-emerald-700/90">
                                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                        <span>Update <code>AcademicYearContext.tsx</code> with the new year string</span>
                                    </li>
                                    <li className="flex items-start gap-3 text-xs text-emerald-700/90">
                                        <div className="mt-1.5 h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_5px_rgba(16,185,129,0.5)]" />
                                        <span>Upload Coordinator lists via individual management pages</span>
                                    </li>
                                </ul>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </DashboardLayout>
    );
}
