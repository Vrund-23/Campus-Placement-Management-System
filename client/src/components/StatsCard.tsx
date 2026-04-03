import { LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
  iconColor?: string;   // e.g. "blue" | "emerald" | "violet" | "orange"
}

const colorMap: Record<string, { bg: string; ring: string; icon: string; glow: string }> = {
  blue: { bg: 'from-blue-500 to-blue-600', ring: 'ring-blue-300/40', icon: 'text-white', glow: 'shadow-blue-400/30' },
  emerald: { bg: 'from-emerald-500 to-teal-600', ring: 'ring-emerald-300/40', icon: 'text-white', glow: 'shadow-emerald-400/30' },
  violet: { bg: 'from-violet-500 to-purple-600', ring: 'ring-violet-300/40', icon: 'text-white', glow: 'shadow-violet-400/30' },
  orange: { bg: 'from-orange-400 to-rose-500', ring: 'ring-orange-300/40', icon: 'text-white', glow: 'shadow-orange-400/30' },
  rose: { bg: 'from-rose-500 to-pink-600', ring: 'ring-rose-300/40', icon: 'text-white', glow: 'shadow-rose-400/30' },
  amber: { bg: 'from-amber-400 to-orange-500', ring: 'ring-amber-300/40', icon: 'text-white', glow: 'shadow-amber-400/30' },
  cyan: { bg: 'from-cyan-500 to-sky-600', ring: 'ring-cyan-300/40', icon: 'text-white', glow: 'shadow-cyan-400/30' },
};

export function StatsCard({ title, value, subtitle, icon: Icon, trend, className, iconColor = 'blue' }: StatsCardProps) {
  const colors = colorMap[iconColor] ?? colorMap.blue;

  return (
    <Card className={cn("transition-all duration-300 hover:shadow-xl hover:-translate-y-1 hover:border-primary/20 overflow-hidden", className)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-bold text-foreground tracking-tight">{value}</h3>
              {trend && (
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  trend.isPositive
                    ? "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
                    : "text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400"
                )}>
                  {trend.isPositive ? '+' : ''}{trend.value}%
                </span>
              )}
            </div>
            {subtitle && (
              <p className="text-xs text-muted-foreground">{subtitle}</p>
            )}
          </div>
          {/* Gradient icon container with glow */}
          <div className={cn(
            "rounded-2xl bg-gradient-to-br p-3.5 ring-2 shadow-lg",
            colors.bg, colors.ring, colors.glow
          )}>
            <Icon className={cn("h-6 w-6", colors.icon)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

