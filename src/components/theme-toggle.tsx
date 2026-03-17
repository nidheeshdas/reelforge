'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const themeOptions = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
] as const;

export function ThemeToggle() {
  const { setTheme, resolvedTheme, theme } = useTheme();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1 rounded-full border border-border/70 bg-background/90 p-1 shadow-lg backdrop-blur-xl">
      {themeOptions.map((option) => {
        const Icon = option.icon;
        const isActive = theme === option.value || (option.value !== 'system' && theme === 'system' && resolvedTheme === option.value);

        return (
          <Button
            key={option.value}
            type="button"
            size="sm"
            variant="ghost"
            className={cn(
              'h-9 rounded-full px-3 text-xs',
              isActive ? 'bg-foreground text-background hover:bg-foreground/90 hover:text-background' : 'text-muted-foreground'
            )}
            onClick={() => setTheme(option.value)}
          >
            <Icon className="mr-1.5 h-3.5 w-3.5" />
            {option.label}
          </Button>
        );
      })}
    </div>
  );
}
