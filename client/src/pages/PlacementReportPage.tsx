import { useState, useEffect, useMemo } from 'react';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { DEPARTMENTS } from '@/constants/departments';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

interface StudentReportData {
    id: string;
    name: string;
    enrollment_no: string;
    department: string;
    gender: string;
    passing_year: string;
    academic_year: string;
    isPlaced: boolean;
    placedCompanyName: string;
    placedPackage?: string;
    cgpa: string;
}

export default function PlacementReportPage() {
    const { toast } = useToast();
    const { selectedYear } = useAcademicYear();
    const [data, setData] = useState<StudentReportData[]>([]);
    const [loading, setLoading] = useState(true);
    const [branchFilter, setBranchFilter] = useState<string>('All');
    const [yearFilter, setYearFilter] = useState<string>(selectedYear || 'All');

    useEffect(() => {
        if (selectedYear) {
            setYearFilter(selectedYear);
        }
    }, [selectedYear]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get('/students/all?academicYear=all');
            setData(res);
        } catch (err: any) {
            toast({ title: 'Failed to load report data', description: err.message, variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    // Always show all departments in the filter (not just ones that appear in student data)
    const branches = ['All', ...DEPARTMENTS];

    const academicYears = useMemo(() => {
        const years = Array.from(new Set(data.map(item => item.academic_year))).filter(Boolean).sort().reverse();
        if (selectedYear && !years.includes(selectedYear)) {
            years.unshift(selectedYear); // Add to the beginning or we can sort later
            years.sort().reverse();
        }
        return ['All', ...years];
    }, [data, selectedYear]);

    const filteredData = useMemo(() => {
        return data.filter(student => {
            if (!student.isPlaced) return false;
            const academicYearStr = student.academic_year;
            if (yearFilter !== 'All' && academicYearStr !== yearFilter) return false;
            if (branchFilter !== 'All' && student.department !== branchFilter) return false;
            return true;
        });
    }, [data, branchFilter, yearFilter]);

    const handleExport = () => {
        const exportData = filteredData.map(student => ({
            'College ID': student.enrollment_no || '—',
            'Name': student.name,
            'Department': student.department,
            'Gender': student.gender || '—',
            'Academic Year': student.academic_year || '—',
            'CGPA': student.cgpa || '—',
            'Placed Company': student.placedCompanyName || '—',
            'Package (LPA)': student.placedPackage || '—'
        }));

        const ws = XLSX.utils.json_to_sheet(exportData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Placement_Report');
        
        let filename = 'Placement_Report';
        if (yearFilter !== 'All') filename += `_${yearFilter}`;
        if (branchFilter !== 'All') filename += `_${branchFilter}`;
        XLSX.writeFile(wb, `${filename}.xlsx`);
        
        toast({ title: 'Success', description: 'Placement report exported successfully!' });
    };

    if (loading) return (
        <DashboardLayout>
            <div className="flex h-[80vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        </DashboardLayout>
    );

    return (
        <DashboardLayout>
            <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground">Placement Report</h1>
                        <p className="text-muted-foreground">Detailed view of all student placements</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                        <Select value={yearFilter} onValueChange={setYearFilter}>
                            <SelectTrigger className="w-[140px] bg-card">
                                <SelectValue placeholder="Year" />
                            </SelectTrigger>
                            <SelectContent>
                                {academicYears.map(year => (
                                    <SelectItem key={year as string} value={year as string}>{year as string === 'All' ? 'All Years' : year as string}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Select value={branchFilter} onValueChange={setBranchFilter}>
                            <SelectTrigger className="w-[180px] bg-card">
                                <SelectValue placeholder="Branch" />
                            </SelectTrigger>
                            <SelectContent>
                                {branches.map(branch => (
                                    <SelectItem key={branch as string} value={branch as string}>{branch as string}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button onClick={handleExport} disabled={filteredData.length === 0} className="gap-2 shrink-0">
                            <Download className="h-4 w-4" />
                            Export Excel
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader className="py-4 px-6 border-b">
                        <CardTitle className="text-lg">Detailed Records</CardTitle>
                        <CardDescription>Showing {filteredData.length} students</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="pl-6">College ID</TableHead>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Gender</TableHead>
                                        <TableHead>Academic Year</TableHead>
                                        <TableHead>CGPA</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead className="pr-6">Package</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.map((student) => (
                                        <TableRow key={student.id}>
                                            <TableCell className="font-mono text-xs pl-6">{student.enrollment_no || '—'}</TableCell>
                                            <TableCell className="font-medium">{student.name}</TableCell>
                                            <TableCell>{student.department}</TableCell>
                                            <TableCell>{student.gender || '—'}</TableCell>
                                            <TableCell>{student.academic_year || '—'}</TableCell>
                                            <TableCell>{student.cgpa || '—'}</TableCell>
                                            <TableCell className="font-medium text-emerald-600">
                                                {student.placedCompanyName || '—'}
                                            </TableCell>
                                            <TableCell className="pr-6">{student.placedPackage ? `${student.placedPackage} LPA` : '—'}</TableCell>
                                        </TableRow>
                                    ))}
                                    {filteredData.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                                                No students found matching the selected filters.
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
