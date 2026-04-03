import { useState, useEffect, useRef } from 'react';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { VerificationStepper } from '@/components/VerificationStepper';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  User, Mail, GraduationCap, FileText, Upload, Save, Award,
  BookOpen, AlertTriangle, Loader2, Phone, Users, TrendingUp,
  Pencil, X, CheckCircle, MapPin, Trash2, Camera
} from 'lucide-react';

interface StudentProfileData {
  student_id: number;
  user_id: number;
  name: string;
  email: string;
  enrollment_no: string;
  dept_id: number;
  department_name: string;
  cgpa: number | null;
  active_backlogs: number;
  total_backlogs: number;
  class_10_percentage: number | null;
  class_12_percentage: number | null;
  diploma_percentage: number | null;
  gap_years: number;
  phone_number: string | null;
  gender: string | null;
  address: string | null;
  personal_email: string | null;
  date_of_birth: string | null;
  passing_year: number | null;
  linkedin_url: string | null;
  is_verified: boolean;
  tpc_verified: boolean;
  tpo_verified: boolean;
  is_placed: boolean;
  placed_company?: number;
  placed_company_name?: string;
  resume_url?: string;
  profile_picture_url?: string;
}

interface FormData {
  name: string;
  cgpa: string;
  active_backlogs: string;
  total_backlogs: string;
  class_10_percentage: string;
  class_12_percentage: string;
  diploma_percentage: string;
  gap_years: string;
  phone_number: string;
  gender: string;
  address: string;
  personal_email: string;
  date_of_birth: string;
  passing_year: string;
  linkedin_url: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [profile, setProfile] = useState<StudentProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [studentType, setStudentType] = useState<'regular' | 'd2d'>('regular');
  const [formData, setFormData] = useState<FormData>({
    name: '',
    cgpa: '',
    active_backlogs: '',
    total_backlogs: '',
    class_10_percentage: '',
    class_12_percentage: '',
    diploma_percentage: '',
    gap_years: '',
    phone_number: '',
    gender: '',
    address: '',
    personal_email: '',
    date_of_birth: '',
    passing_year: '',
    linkedin_url: '',
  });
  const [errors, setErrors] = useState<Partial<FormData>>({});

  useEffect(() => { fetchProfile(); }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const data = await api.get('/students/me');
      setProfile(data);
      populateForm(data);
    } catch (error: any) {
      toast({ title: 'Error', description: 'Failed to load profile.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const populateForm = (data: StudentProfileData) => {
    // Auto-detect student type: if diploma_percentage is set, treat as D2D
    setStudentType(data.diploma_percentage != null ? 'd2d' : 'regular');
    setFormData({
      name: data.name ?? '',
      cgpa: data.cgpa?.toString() ?? '',
      active_backlogs: data.active_backlogs?.toString() ?? '0',
      total_backlogs: data.total_backlogs?.toString() ?? '0',
      class_10_percentage: data.class_10_percentage?.toString() ?? '',
      class_12_percentage: data.class_12_percentage?.toString() ?? '',
      diploma_percentage: data.diploma_percentage?.toString() ?? '',
      gap_years: data.gap_years?.toString() ?? '0',
      phone_number: data.phone_number ?? '',
      gender: data.gender ?? '',
      address: data.address ?? '',
      personal_email: data.personal_email ?? '',
      date_of_birth: data.date_of_birth ? data.date_of_birth.split('T')[0] : '',
      passing_year: data.passing_year?.toString() ?? '',
      linkedin_url: data.linkedin_url ?? '',
    });
  };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    const num = (s: string) => (s === '' ? NaN : parseFloat(s));

    if (formData.cgpa !== '' && (isNaN(num(formData.cgpa)) || num(formData.cgpa) < 0 || num(formData.cgpa) > 10))
      e.cgpa = 'Must be 0 – 10';
    if (formData.class_10_percentage !== '' && (isNaN(num(formData.class_10_percentage)) || num(formData.class_10_percentage) < 0 || num(formData.class_10_percentage) > 100))
      e.class_10_percentage = 'Must be 0 – 100';
    if (formData.class_12_percentage !== '' && (isNaN(num(formData.class_12_percentage)) || num(formData.class_12_percentage) < 0 || num(formData.class_12_percentage) > 100))
      e.class_12_percentage = 'Must be 0 – 100';
    if (formData.diploma_percentage !== '' && (isNaN(num(formData.diploma_percentage)) || num(formData.diploma_percentage) < 0 || num(formData.diploma_percentage) > 100))
      e.diploma_percentage = 'Must be 0 – 100';
    if (formData.active_backlogs !== '' && (isNaN(parseInt(formData.active_backlogs)) || parseInt(formData.active_backlogs) < 0))
      e.active_backlogs = 'Cannot be negative';
    if (formData.total_backlogs !== '' && (isNaN(parseInt(formData.total_backlogs)) || parseInt(formData.total_backlogs) < 0))
      e.total_backlogs = 'Cannot be negative';
    if (formData.gap_years !== '' && (isNaN(parseInt(formData.gap_years)) || parseInt(formData.gap_years) < 0))
      e.gap_years = 'Cannot be negative';
    if (formData.phone_number && !/^[6-9]\d{9}$/.test(formData.phone_number.replace(/\s/g, '')))
      e.phone_number = 'Enter valid 10-digit mobile number';

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      toast({ title: 'Validation Error', description: 'Please fix the highlighted errors.', variant: 'destructive' });
      return;
    }
    try {
      setSaving(true);
      const payload: Record<string, any> = {};
      if (formData.name !== '') payload.name = formData.name;
      if (formData.cgpa !== '') payload.cgpa = parseFloat(formData.cgpa);
      if (formData.active_backlogs !== '') payload.active_backlogs = parseInt(formData.active_backlogs);
      if (formData.total_backlogs !== '') payload.total_backlogs = parseInt(formData.total_backlogs);
      if (formData.class_10_percentage !== '') payload.class_10_percentage = parseFloat(formData.class_10_percentage);
      if (formData.class_12_percentage !== '') payload.class_12_percentage = parseFloat(formData.class_12_percentage);
      if (formData.diploma_percentage !== '') payload.diploma_percentage = parseFloat(formData.diploma_percentage);
      if (formData.gap_years !== '') payload.gap_years = parseInt(formData.gap_years);
      if (formData.phone_number !== '') payload.phone_number = formData.phone_number;
      if (formData.gender !== '') payload.gender = formData.gender;
      if (formData.address !== '') payload.address = formData.address;
      if (formData.personal_email !== '') payload.personal_email = formData.personal_email;
      if (formData.date_of_birth !== '') payload.date_of_birth = formData.date_of_birth;
      if (formData.passing_year !== '') payload.passing_year = parseInt(formData.passing_year);
      if (formData.linkedin_url !== '') payload.linkedin_url = formData.linkedin_url;

      await api.put('/students/me', payload);
      await fetchProfile();
      setIsEditing(false);
      toast({ title: 'Profile Updated ✓', description: 'Your academic details have been saved.' });
    } catch (error: any) {
      toast({ title: 'Update Failed', description: error.message || 'Please try again.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (profile) populateForm(profile);
    setErrors({});
    setIsEditing(false);
  };

  const getVerificationStage = () => {
    if (!profile) return 'pending' as const;
    if (profile.tpo_verified) return 'tpo_verified' as const;
    if (profile.tpc_verified) return 'tpc_verified' as const;
    return 'pending' as const;
  };

  const f = (val: number | null | undefined, suffix = '%') =>
    val != null ? `${parseFloat(val.toString()).toFixed(2)}${suffix}` : '—';

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!profile) {
    return (
      <DashboardLayout>
        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
          <GraduationCap className="h-16 w-16 text-muted-foreground/30" />
          <h2 className="text-xl font-bold">Profile Not Found</h2>
          <p className="text-muted-foreground">Please contact your administrator.</p>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6 max-w-5xl mx-auto">

        {/* Page title */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">My Profile</h1>
            <p className="text-muted-foreground">Manage your academic details and placement eligibility</p>
          </div>
          {!isEditing ? (
            <Button onClick={() => setIsEditing(true)} className="gap-2">
              <Pencil className="h-4 w-4" /> Edit Profile
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel} className="gap-2">
                <X className="h-4 w-4" /> Cancel
              </Button>
              <Button onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Profile Header Card */}
        <Card className="glass-card">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 md:flex-row md:items-center">
              {/* Clickable Avatar with upload overlay */}
              <div className="relative group shrink-0">
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  id="avatar-upload"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const token = localStorage.getItem('token');
                    const form = new FormData();
                    form.append('profile_picture', file);
                    try {
                      const res = await fetch('http://localhost:5000/students/me/profile-picture', {
                        method: 'POST',
                        headers: { jwt_token: token },
                        body: form,
                      });
                      const data = await res.json();
                      if (!res.ok) throw new Error(data.error || 'Upload failed');
                      setProfile(p => p ? { ...p, profile_picture_url: data.profile_picture_url } : p);
                      toast({ title: 'Photo updated ✓' });
                    } catch (err: any) {
                      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
                    }
                    e.target.value = '';
                  }}
                />
                <label htmlFor="avatar-upload" className="cursor-pointer">
                  <Avatar className="h-20 w-20 ring-4 ring-primary/20">
                    {profile.profile_picture_url && (
                      <AvatarImage src={`http://localhost:5000${profile.profile_picture_url}`} alt={profile.name} className="object-cover" />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-2xl font-bold">
                      {profile.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                  {/* Camera overlay on hover */}
                  <div className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="h-6 w-6 text-white" />
                  </div>
                </label>

              </div>
              <div className="flex-1 text-center md:text-left">
                <div className="flex flex-wrap items-center gap-2 mb-1 justify-center md:justify-start">
                  <h2 className="text-2xl font-bold text-foreground">{profile.name}</h2>
                  {profile.is_placed && profile.placed_company_name && (
                    <Badge className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30">
                      <Award className="h-3 w-3 mr-1" /> Placed at {profile.placed_company_name}
                    </Badge>
                  )}
                  {!profile.is_placed && (
                    <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                      Seeking Placement
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground">{profile.email}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground justify-center md:justify-start">
                  <span className="flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" />{profile.department_name || '—'}</span>
                  <span className="flex items-center gap-1"><FileText className="h-3.5 w-3.5" />College ID: {profile.enrollment_no}</span>
                  {profile.phone_number && <span className="flex items-center gap-1"><Phone className="h-3.5 w-3.5" />{profile.phone_number}</span>}
                  {profile.gender && <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{profile.gender}</span>}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Verification Status */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Verification Status
            </CardTitle>
            <CardDescription>Your profile verification progress for placements</CardDescription>
          </CardHeader>
          <CardContent>
            <VerificationStepper
              currentStage={getVerificationStage()}
              isTpcVerified={profile.tpc_verified}
              isTpoVerified={profile.tpo_verified}
            />
            <p className={`mt-4 text-sm text-center font-medium ${profile.is_verified ? 'text-emerald-600' : 'text-amber-600'}`}>
              {profile.is_verified
                ? '✓ Your profile is verified — you can apply for jobs'
                : '⏳ Waiting for verification by placement coordinators'}
            </p>
          </CardContent>
        </Card>

        {/* ─── Academic Details ─── */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Academic Details
            </CardTitle>
            <CardDescription>Scores across all academic milestones</CardDescription>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="space-y-5">

                {/* ── Student Type Toggle ── */}
                <div className="space-y-1.5">
                  <Label>Student Type</Label>
                  <div className="flex rounded-lg border border-input overflow-hidden w-fit">
                    <button
                      type="button"
                      onClick={() => {
                        setStudentType('regular');
                        setFormData(p => ({ ...p, diploma_percentage: '' }));
                      }}
                      className={`px-5 py-2 text-sm font-medium transition-colors ${studentType === 'regular'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted/50'
                        }`}
                    >
                      Regular Student
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentType('d2d');
                        setFormData(p => ({ ...p, class_12_percentage: '' }));
                      }}
                      className={`px-5 py-2 text-sm font-medium transition-colors ${studentType === 'd2d'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-background text-muted-foreground hover:bg-muted/50'
                        }`}
                    >
                      D2D Student
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {studentType === 'regular'
                      ? 'Regular students: entered via 12th standard'
                      : 'Direct-to-Degree students: entered via Diploma / ITI'}
                  </p>
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                  {/* 10th */}
                  <div className="space-y-1.5">
                    <Label htmlFor="class_10">10th Percentage (%)</Label>
                    <Input id="class_10" type="number" step="0.01" min="0" max="100"
                      placeholder="e.g. 85.50"
                      value={formData.class_10_percentage}
                      onChange={e => setFormData(p => ({ ...p, class_10_percentage: e.target.value }))}
                      className={errors.class_10_percentage ? 'border-destructive' : ''} />
                    {errors.class_10_percentage && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{errors.class_10_percentage}</p>}
                  </div>

                  {/* 12th — only for Regular */}
                  {studentType === 'regular' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="class_12">12th Percentage (%)</Label>
                      <Input id="class_12" type="number" step="0.01" min="0" max="100"
                        placeholder="e.g. 78.25"
                        value={formData.class_12_percentage}
                        onChange={e => setFormData(p => ({ ...p, class_12_percentage: e.target.value }))}
                        className={errors.class_12_percentage ? 'border-destructive' : ''} />
                      {errors.class_12_percentage && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{errors.class_12_percentage}</p>}
                    </div>
                  )}

                  {/* Diploma — only for D2D */}
                  {studentType === 'd2d' && (
                    <div className="space-y-1.5">
                      <Label htmlFor="diploma">Diploma / ITI (%)</Label>
                      <Input id="diploma" type="number" step="0.01" min="0" max="100"
                        placeholder="e.g. 75.00"
                        value={formData.diploma_percentage}
                        onChange={e => setFormData(p => ({ ...p, diploma_percentage: e.target.value }))}
                        className={errors.diploma_percentage ? 'border-destructive' : ''} />
                      {errors.diploma_percentage && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{errors.diploma_percentage}</p>}
                    </div>
                  )}

                  {/* CGPA / CPI */}
                  <div className="space-y-1.5">
                    <Label htmlFor="cgpa">CGPA / CPI (0 – 10)</Label>
                    <Input id="cgpa" type="number" step="0.01" min="0" max="10"
                      placeholder="e.g. 8.86"
                      value={formData.cgpa}
                      onChange={e => setFormData(p => ({ ...p, cgpa: e.target.value }))}
                      className={errors.cgpa ? 'border-destructive' : ''} />
                    {errors.cgpa && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{errors.cgpa}</p>}
                  </div>

                  {/* Active Backlogs */}
                  <div className="space-y-1.5">
                    <Label htmlFor="active_bl">Active Backlogs</Label>
                    <Input id="active_bl" type="number" min="0"
                      placeholder="Currently active"
                      value={formData.active_backlogs}
                      onChange={e => setFormData(p => ({ ...p, active_backlogs: e.target.value }))}
                      className={errors.active_backlogs ? 'border-destructive' : ''} />
                    {errors.active_backlogs && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{errors.active_backlogs}</p>}
                  </div>

                  {/* Total (historical) Backlogs */}
                  <div className="space-y-1.5">
                    <Label htmlFor="total_bl">Total Backlogs (historical)</Label>
                    <Input id="total_bl" type="number" min="0"
                      placeholder="All-time count"
                      value={formData.total_backlogs}
                      onChange={e => setFormData(p => ({ ...p, total_backlogs: e.target.value }))}
                      className={errors.total_backlogs ? 'border-destructive' : ''} />
                    {errors.total_backlogs && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{errors.total_backlogs}</p>}
                  </div>

                  {/* Gap Years */}
                  <div className="space-y-1.5">
                    <Label htmlFor="gap">Gap Years</Label>
                    <Input id="gap" type="number" min="0"
                      placeholder="Years of gap (if any)"
                      value={formData.gap_years}
                      onChange={e => setFormData(p => ({ ...p, gap_years: e.target.value }))}
                      className={errors.gap_years ? 'border-destructive' : ''} />
                    {errors.gap_years && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{errors.gap_years}</p>}
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Student type badge */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Student Type:</span>
                  <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-semibold border ${profile.diploma_percentage != null
                    ? 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/30'
                    : 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30'
                    }`}>
                    {profile.diploma_percentage != null ? 'D2D Student' : 'Regular Student'}
                  </span>
                </div>

                {/* Row 1 – schooling */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Schooling</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    <AcademicCell label="10th Percentage" value={f(profile.class_10_percentage)} color="blue" />
                    {profile.diploma_percentage != null ? (
                      <AcademicCell label="Diploma / ITI" value={f(profile.diploma_percentage)} color="violet" />
                    ) : (
                      <AcademicCell label="12th Percentage" value={f(profile.class_12_percentage)} color="indigo" />
                    )}
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border/50" />

                {/* Row 2 – university */}
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">University</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <AcademicCell label="CGPA / CPI" value={profile.cgpa ? parseFloat(profile.cgpa.toString()).toFixed(2) : '—'} color="emerald" suffix="" />
                    {(profile.active_backlogs ?? 0) > 0 && (
                      <AcademicCell label="Active Backlogs" value={String(profile.active_backlogs)} color="red" suffix="" />
                    )}
                    {(profile.total_backlogs ?? 0) > 0 && (
                      <AcademicCell label="Total Backlogs" value={String(profile.total_backlogs)} color="amber" suffix="" />
                    )}
                    <AcademicCell label="Gap Years" value={String(profile.gap_years ?? 0)} color="slate" suffix="" />
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Personal Details ─── */}
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Personal Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isEditing ? (
              <div className="grid gap-5 sm:grid-cols-2">
                {/* Name */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="full_name">Full Name</Label>
                  <Input id="full_name" type="text" placeholder="Your full name"
                    value={formData.name}
                    onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
                </div>

                {/* Phone */}
                <div className="space-y-1.5">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input id="phone" type="tel" placeholder="10-digit mobile number"
                    value={formData.phone_number}
                    onChange={e => setFormData(p => ({ ...p, phone_number: e.target.value }))}
                    className={errors.phone_number ? 'border-destructive' : ''} />
                  {errors.phone_number && <p className="text-xs text-destructive flex gap-1"><AlertTriangle className="h-3 w-3 mt-0.5" />{errors.phone_number}</p>}
                </div>

                {/* Personal Email */}
                <div className="space-y-1.5">
                  <Label htmlFor="personal_email">Personal Email</Label>
                  <Input id="personal_email" type="email" placeholder="e.g. yourname@gmail.com"
                    value={formData.personal_email}
                    onChange={e => setFormData(p => ({ ...p, personal_email: e.target.value }))} />
                </div>

                {/* Gender */}
                <div className="space-y-1.5">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={formData.gender}
                    onChange={e => setFormData(p => ({ ...p, gender: e.target.value }))}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Select gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                {/* Address */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="address">Address</Label>
                  <textarea
                    id="address"
                    rows={3}
                    placeholder="Street, City, State, PIN code"
                    value={formData.address}
                    onChange={e => setFormData(p => ({ ...p, address: e.target.value }))}
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                  />
                </div>

                {/* Date of Birth */}
                <div className="space-y-1.5">
                  <Label htmlFor="dob">Date of Birth</Label>
                  <Input id="dob" type="date"
                    value={formData.date_of_birth}
                    onChange={e => setFormData(p => ({ ...p, date_of_birth: e.target.value }))} />
                </div>

                {/* Passing Year */}
                <div className="space-y-1.5">
                  <Label htmlFor="passing_year">Passing Year</Label>
                  <Input id="passing_year" type="number" placeholder="e.g. 2026" min={2020} max={2035}
                    value={formData.passing_year}
                    onChange={e => setFormData(p => ({ ...p, passing_year: e.target.value }))} />
                </div>

                {/* LinkedIn */}
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="linkedin">LinkedIn Profile URL</Label>
                  <Input id="linkedin" type="url" placeholder="https://linkedin.com/in/yourname"
                    value={formData.linkedin_url}
                    onChange={e => setFormData(p => ({ ...p, linkedin_url: e.target.value }))} />
                </div>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-3">
                <DetailRow icon={User} label="Full Name" value={profile.name} />
                <DetailRow icon={Mail} label="College Email" value={profile.email} />
                <DetailRow icon={Mail} label="Personal Email" value={profile.personal_email || '—'} />
                <DetailRow icon={Phone} label="Phone" value={profile.phone_number || '—'} />
                <DetailRow icon={Users} label="Gender" value={profile.gender || '—'} />
                <DetailRow icon={GraduationCap} label="Department" value={profile.department_name || '—'} />
                <DetailRow icon={FileText} label="College ID" value={profile.enrollment_no} />
                <DetailRow icon={FileText} label="Date of Birth" value={profile.date_of_birth ? new Date(profile.date_of_birth).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'} />
                <DetailRow icon={GraduationCap} label="Passing Year" value={profile.passing_year ? String(profile.passing_year) : '—'} />
                {profile.linkedin_url && (
                  <div className="flex items-center gap-3 py-2 border-b border-border/30 sm:col-span-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground w-28 shrink-0">LinkedIn</span>
                    <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer"
                      className="text-sm font-medium text-primary hover:underline truncate">
                      {profile.linkedin_url}
                    </a>
                  </div>
                )}
                {profile.address && (
                  <div className="flex items-start gap-3 py-2 border-b border-border/30 sm:col-span-2">
                    <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                    <span className="text-xs text-muted-foreground w-28 shrink-0">Address</span>
                    <span className="text-sm font-medium text-foreground whitespace-pre-wrap">{profile.address}</span>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Resume ─── */}
        <ResumeCard
          resumeUrl={profile.resume_url ?? null}
          onUploadSuccess={(url) => setProfile(p => p ? { ...p, resume_url: url } : p)}
          onDeleteSuccess={() => setProfile(p => p ? { ...p, resume_url: null } : p)}
        />

      </div>
    </DashboardLayout>
  );
}

/* ─── Helper sub-components ─── */
const colorMap: Record<string, string> = {
  blue: 'text-blue-600 dark:text-blue-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
  violet: 'text-violet-600 dark:text-violet-400',
  emerald: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-500',
  amber: 'text-amber-500',
  slate: 'text-slate-600 dark:text-slate-400',
};

function AcademicCell({ label, value, color = 'blue', suffix = '', dimIfNull = false }: {
  label: string; value: string; color?: string; suffix?: string; dimIfNull?: boolean;
}) {
  return (
    <div className={`rounded-xl bg-muted/40 p-4 text-center border border-border/40 ${dimIfNull ? 'opacity-50' : ''}`}>
      <p className={`text-2xl font-bold ${colorMap[color] ?? colorMap.blue}`}>
        {value}{value !== '—' ? suffix : ''}
      </p>
      <p className="text-xs text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-2 border-b border-border/30 last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
      <span className="text-xs text-muted-foreground w-28 shrink-0">{label}</span>
      <span className="text-sm font-medium text-foreground truncate">{value}</span>
    </div>
  );
}

/* ─── ResumeCard ─── */
function ResumeCard({
  resumeUrl,
  onUploadSuccess,
  onDeleteSuccess,
}: {
  resumeUrl: string | null;
  onUploadSuccess: (url: string) => void;
  onDeleteSuccess: () => void;
}) {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      toast({ title: 'Invalid file', description: 'Only PDF files are accepted.', variant: 'destructive' });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max allowed size is 5 MB.', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const token = localStorage.getItem('token');
      const form = new FormData();
      form.append('resume', file);
      const res = await fetch('http://localhost:5000/students/me/resume', {
        method: 'POST',
        headers: { jwt_token: token },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      onUploadSuccess(data.resume_url);
      toast({ title: 'Resume uploaded ✓', description: 'Your resume is saved and visible to recruiters.' });
    } catch (err: any) {
      toast({ title: 'Upload failed', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/students/me/resume', {
        method: 'DELETE',
        headers: { jwt_token: token },
      });
      if (!res.ok) throw new Error('Delete failed');
      onDeleteSuccess();
      toast({ title: 'Resume removed', description: 'Your resume has been deleted.' });
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
    }
  };

  const filename = resumeUrl ? resumeUrl.split('/').pop() : null;

  return (
    <Card className="glass-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Resume
        </CardTitle>
        <CardDescription>PDF only · Max 5 MB · Visible to recruiters after upload</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {resumeUrl ? (
          /* ── Uploaded state ── */
          <div className="flex flex-col gap-3">
            {/* File info */}
            <div className="flex items-center gap-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4">
              <div className="h-12 w-12 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0">
                <FileText className="h-6 w-6 text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="font-medium text-foreground truncate text-sm">{filename}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">✓ Resume uploaded</p>
              </div>
            </div>
            {/* Action buttons — full width on mobile, auto on sm+ */}
            <div className="flex flex-col sm:flex-row gap-2">
              <a
                href={`http://localhost:5000${resumeUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 sm:flex-none"
              >
                <Button variant="outline" className="gap-2 w-full sm:w-auto">
                  <FileText className="h-4 w-4" /> View PDF
                </Button>
              </a>
              <Button
                variant="outline"
                className="gap-2 text-destructive hover:text-destructive flex-1 sm:flex-none"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Remove
              </Button>
              <Button
                className="gap-2 flex-1 sm:flex-none"
                onClick={() => inputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Replace
              </Button>
            </div>
          </div>

        ) : (
          /* ── Empty state — drag-feel upload zone ── */
          <div
            onClick={() => !uploading && inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer p-10 bg-muted/20"
          >
            {uploading ? (
              <>
                <Loader2 className="h-10 w-10 text-primary animate-spin" />
                <p className="text-sm font-medium text-primary">Uploading…</p>
              </>
            ) : (
              <>
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Upload className="h-7 w-7 text-primary" />
                </div>
                <div className="text-center">
                  <p className="font-medium text-foreground">Click to upload your resume</p>
                  <p className="text-sm text-muted-foreground mt-0.5">PDF only · Max 5 MB</p>
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

