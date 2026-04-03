import { StudentProfile } from '@/types';
import { Card, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { FileText, Mail, GraduationCap, AlertTriangle, CheckCircle, XCircle, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface StudentVerificationCardProps {
  student: StudentProfile;
  verificationType: 'tpc' | 'tpo';
  onVerify: (studentId: string) => void;
  onReject?: (studentId: string) => void;
}

export function StudentVerificationCard({
  student,
  verificationType,
  onVerify,
  onReject
}: StudentVerificationCardProps) {
  const canVerify = () => {
    switch (verificationType) {
      case 'tpc':
        return !student.isTpcVerified;

      case 'tpo':
        return student.isTpcVerified && !student.isTpoVerified;
      default:
        return false;
    }
  };

  const isAlreadyVerified = () => {
    switch (verificationType) {
      case 'tpc':
        return student.isTpcVerified;

      case 'tpo':
        return student.isTpoVerified;
      default:
        return false;
    }
  };

  return (
    <Card className="hover:border-primary/40 transition-shadow shadow-sm group">
      <div className="flex items-center gap-4 p-2 pl-3">
        {/* Compact Avatar */}
        <Avatar className="h-10 w-10 shrink-0 border border-border">
          {(student as any).profile_picture_url ? (
            <img src={`http://localhost:5000${(student as any).profile_picture_url}`} alt={student.name} className="h-full w-full object-cover" />
          ) : (
            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
              {student.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          )}
        </Avatar>

        {/* Name and Basic Info */}
        <div className="flex-1 min-w-0 flex items-center gap-4">
          <div className="min-w-[140px]">
            <h3 className="font-semibold text-sm text-foreground truncate">{student.name}</h3>
            <p className="text-[10px] text-muted-foreground truncate">{student.email}</p>
          </div>

          <div className="hidden md:flex items-center gap-2 px-3 border-l border-border h-8">
            <Badge variant="secondary" className="text-[10px] font-medium h-5 px-2 bg-muted/50">
              {student.department}
            </Badge>
          </div>

          <div className="hidden lg:flex items-center gap-2 px-3 border-l border-border h-8">
            {student.isPlaced ? (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-none text-[10px] h-5 px-2">
                Placed {student.placedCompany ? `@ ${student.placedCompany}` : ''}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground text-[10px] h-5 px-2">
                Not Placed
              </Badge>
            )}
          </div>
        </div>

        {/* Actions Row */}
        <div className="flex items-center gap-2 shrink-0 pr-1">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-primary hover:bg-primary/5 px-2">
                <Eye className="h-3.5 w-3.5" />
                <span className="hidden sm:inline">Details</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[450px]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    {(student as any).profile_picture_url && (
                      <img src={`http://localhost:5000${(student as any).profile_picture_url}`} alt={student.name} className="h-full w-full object-cover rounded-full" />
                    )}
                    <AvatarFallback>{student.name[0]}</AvatarFallback>
                  </Avatar>
                  {student.name}
                </DialogTitle>
                <DialogDescription>Student Academic Profile</DialogDescription>
              </DialogHeader>

              <div className="space-y-6 py-4">
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-primary/5 p-3 border border-primary/10">
                    <p className="text-2xl font-bold text-primary">{student.cgpa}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">CGPA</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 border border-border">
                    <p className="text-2xl font-bold text-foreground">{student.backlogs}</p>
                    <p className="text-[10px] font-medium text-muted-foreground uppercase">Backlogs</p>
                  </div>
                  <div className="rounded-xl bg-muted/30 p-3 border border-border flex flex-col items-center justify-center">
                    {(student.resume_url || student.resumeUrl) ? (
                      <a href={`http://localhost:5000${student.resume_url || student.resumeUrl}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:scale-110 transition-transform">
                        <FileText className="h-6 w-6" />
                      </a>
                    ) : (
                      <span className="text-[10px] italic">No PDF</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-muted/20 p-3 border border-border">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1 uppercase">10th Score</p>
                    <p className="text-lg font-bold">{student.class_10_percentage ?? '—'}%</p>
                  </div>
                  <div className="rounded-lg bg-muted/20 p-3 border border-border">
                    <p className="text-[10px] text-muted-foreground font-medium mb-1 uppercase">
                      {student.diploma_percentage != null ? 'Diploma' : '12th'} Score
                    </p>
                    <p className="text-lg font-bold">
                      {student.class_12_percentage ?? student.diploma_percentage ?? '—'}%
                    </p>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <div className="h-6 w-[1px] bg-border mx-1 hidden sm:block" />

          {canVerify() ? (
            <div className="flex gap-1">
              <Button size="sm" className="h-8 px-3 text-xs gap-1.5" onClick={() => onVerify(student.id)}>
                <CheckCircle className="h-3.5 w-3.5" />
                Verify
              </Button>
              {onReject && (
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10" onClick={() => onReject(student.id)}>
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
