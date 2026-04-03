import {
  Home,
  Briefcase,
  FileText,
  Users,
  CheckCircle,
  Building2,
  BarChart3,
  Settings,
  LogOut,
  GraduationCap,
  UserCheck,
  UserPlus,
  ClipboardCheck,
  Shield,
  Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ACADEMIC_YEARS, useAcademicYear, AcademicYear } from '@/contexts/AcademicYearContext';
import { Calendar, PlusCircle } from 'lucide-react';

interface NavItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
}

const roleNavItems: Record<UserRole, NavItem[]> = {
  student: [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Job Listings', url: '/jobs', icon: Briefcase },
    { title: 'My Applications', url: '/applications', icon: FileText },
    { title: 'My Profile', url: '/profile', icon: Users },
    { title: 'Notifications', url: '/notifications', icon: Bell },
  ],
  tpc: [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Manage Students', url: '/manage-students', icon: UserPlus },
    { title: 'Student Verification', url: '/verify-students', icon: UserCheck },
    { title: 'Department Students', url: '/students', icon: Users },
  ],
  tpf: [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Department Students', url: '/students', icon: Users },
  ],

  tpo: [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Manage TPCs', url: '/manage-tpcs', icon: UserCheck },
    { title: 'Manage TPFs', url: '/manage-tpfs', icon: UserPlus },
    { title: 'Companies', url: '/companies', icon: Building2 },
    { title: 'Job Postings', url: '/manage-jobs', icon: Briefcase },
    { title: 'All Students', url: '/students', icon: Users },
    { title: 'Final Verification', url: '/final-verification', icon: Shield },
    { title: 'Placement Report', url: '/placement-report', icon: FileText },
    { title: 'Analytics', url: '/analytics', icon: BarChart3 },
    { title: 'System Settings', url: '/settings', icon: Settings },
  ],
  principal: [
    { title: 'Dashboard', url: '/dashboard', icon: Home },
    { title: 'Placement Analytics', url: '/analytics', icon: BarChart3 },
    { title: 'Department Overview', url: '/departments', icon: GraduationCap },
  ],
};

const roleLabels: Record<UserRole, string> = {
  student: 'Student Portal',
  tpc: 'TPC Coordinator',
  tpf: 'TPF Faculty',
  tpo: 'TPO Admin',
  principal: 'Principal View',
};

export function AppSidebar() {
  const { user, logout } = useAuth();
  const { state, setOpenMobile, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const { selectedYear, setSelectedYear, isPastYear: checkIsPast } = useAcademicYear();

  if (!user) return null;

  const navItems = roleNavItems[user.role] || [];
  const roleLabel = roleLabels[user.role] || 'Unknown Role';
  
  // 1. Determine if the selected year is a past year
  const isPastYear = checkIsPast(selectedYear);

  // 2. Filter out nav items if it's a past year
  let finalNavItems = navItems;
  if (isPastYear && user.role === 'tpo') {
    finalNavItems = finalNavItems.filter(item => 
      item.title !== 'Job Postings' && item.title !== 'Final Verification'
    );
  }

  const handleNavClick = (url: string) => {
    if (isMobile) setOpenMobile(false);
    navigate(url);
  };

  const isManagementRole = user.role === 'tpo' || user.role === 'principal' || user.role === 'tpf';

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border">
      <SidebarHeader className="border-b border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
            <GraduationCap className="h-6 w-6 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">CPMS</span>
              <span className="text-xs text-muted-foreground">{roleLabel}</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        {isManagementRole && !collapsed && (
          <SidebarGroup className="pb-4">
            <SidebarGroupLabel className="text-muted-foreground flex items-center justify-between gap-2 w-full">
              <span className="flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Academic Year
              </span>
              {user.role === 'tpo' && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button 
                      onClick={() => navigate('/settings')}
                      className="hover:text-primary transition-colors cursor-pointer"
                    >
                      <PlusCircle className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">Initialize New Year</TooltipContent>
                </Tooltip>
              )}
            </SidebarGroupLabel>
            <SidebarGroupContent className="mt-2">
              <Select value={selectedYear} onValueChange={(val: AcademicYear) => setSelectedYear(val)}>
                <SelectTrigger className="w-full bg-sidebar-accent/50 border-sidebar-border h-9 text-xs">
                  <SelectValue placeholder="Select Year" />
                </SelectTrigger>
                <SelectContent className="bg-sidebar-accent border-sidebar-border">
                  {ACADEMIC_YEARS.map((year) => (
                    <SelectItem key={year} value={year} className="text-xs">
                      Batch {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {finalNavItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <NavLink
                        to={item.url}
                        onClick={() => handleNavClick(item.url)}
                        className="flex items-center gap-3 rounded-md px-3 py-2 text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground w-full"
                        activeClassName="bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground"
                      >
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">
                        {item.title}
                      </TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-4">
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
              {user.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <span className="truncate text-sm font-medium text-sidebar-foreground">{user.name}</span>
              <span className="truncate text-xs text-muted-foreground">{user.email}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={handleLogout}
            className="shrink-0 text-muted-foreground hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
