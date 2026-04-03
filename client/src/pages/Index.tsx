import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-6 animate-pulse">
          <div className="relative h-16 w-16">
            <div className="absolute inset-0 rounded-full border-4 border-primary/30" />
            <div className="absolute inset-0 rounded-full border-4 border-t-primary animate-spin" />
            <div className="absolute inset-4 rounded-full bg-primary/20 blur-sm" />
          </div>
          <div className="flex flex-col items-center gap-1">
            <p className="text-lg font-semibold text-foreground tracking-tight">DesignEngineering</p>
            <p className="text-sm text-muted-foreground">Loading your experience...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
};

export default Index;
