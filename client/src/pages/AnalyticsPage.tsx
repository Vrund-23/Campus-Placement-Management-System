import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { PlacementChart } from '@/components/PlacementChart';
import { StatsCard } from '@/components/StatsCard';
import { usePlacementStats } from '@/contexts/PlacementStatsContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Award, Building2, Briefcase, TrendingUp, TrendingDown, Loader2, Download } from 'lucide-react';
import { useAcademicYear } from '@/contexts/AcademicYearContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import * as XLSX from 'xlsx';

export default function AnalyticsPage() {
  const { data, loading } = usePlacementStats();
  const { selectedYear } = useAcademicYear();
  const { stats, branchPlacements } = data;

  const exportAnalytics = () => {
    const worksheetData = branchPlacements.map(b => ({
      'Branch': b.branch,
      'Total': b.total,
      'Placed': b.placed,
      'Percentage': `${b.percentage}%`,
      'Year': selectedYear
    }));
    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Analytics');
    XLSX.writeFile(workbook, `Placement_Analytics_${selectedYear}.xlsx`);
  };

  const placementRate = stats.totalStudents > 0
    ? ((stats.placedStudents / stats.totalStudents) * 100).toFixed(1)
    : '0.0';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
               <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/20">Batch {selectedYear}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">Placement Analytics</h1>
            <p className="text-muted-foreground">Comprehensive statistics for the {selectedYear} recruitment cycle</p>
          </div>
          <Button variant="outline" className="gap-2" onClick={exportAnalytics}>
            <Download className="h-4 w-4" />
            Export Analytics
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatsCard
            title="Total Students"
            value={stats.totalStudents}
            icon={Users}
            iconColor="blue"
            subtitle="Registered for placements"
          />
          <StatsCard
            title="Placed Students"
            value={stats.placedStudents}
            icon={Award}
            iconColor="emerald"
            subtitle={`${placementRate}% placement rate`}
          />
          <StatsCard
            title="Companies Visited"
            value={stats.companiesVisited}
            icon={Building2}
            iconColor="orange"
          />
          <StatsCard
            title="Active Openings"
            value={stats.activeJobs}
            icon={Briefcase}
            iconColor="violet"
          />
        </div>

        {/* Charts */}
        {branchPlacements.length > 0 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <PlacementChart data={branchPlacements} type="bar" />
            <PlacementChart data={branchPlacements} type="pie" />
          </div>
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center py-12 text-muted-foreground">
              No placement data available yet.
            </CardContent>
          </Card>
        )}

        {/* Branch-wise Detailed Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Branch-wise Placement Details</CardTitle>
            <CardDescription>Detailed breakdown of placements by department</CardDescription>
          </CardHeader>
          <CardContent>
            {branchPlacements.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-6">No data available.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">Branch</th>
                      <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Total Students</th>
                      <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Placed</th>
                      <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Unplaced</th>
                      <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">Placement %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchPlacements.map((branch) => (
                      <tr key={branch.branch} className="border-b border-border last:border-0">
                        <td className="py-4 px-4 font-medium text-foreground">{branch.branch}</td>
                        <td className="py-4 px-4 text-center text-muted-foreground">{branch.total}</td>
                        <td className="py-4 px-4 text-center text-primary font-medium">{branch.placed}</td>
                        <td className="py-4 px-4 text-center text-muted-foreground">{branch.total - branch.placed}</td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary"
                                style={{ width: `${branch.percentage}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium text-foreground">
                              {branch.percentage.toFixed(1)}%
                            </span>
                          </div>
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
