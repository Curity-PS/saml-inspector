import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer',
  {
    variants: {
      variant: {
        // Primary CTA — Curity magenta-pink spot color (#d859a1) deepening
        // to purple-magenta (#87148b) on hover, matching curity.io's
        // --color-link / --color-link-hover pair. Pill shape + brand glow
        // mirror the "Explore Access Intelligence" / "Start free trial"
        // CTAs on curity.io.
        default: 'bg-brand-500 text-white brand-glow-sm hover:bg-brand-800',
        destructive: 'bg-red-600 text-white shadow-sm hover:bg-red-700',
        outline:
          'border border-hairline bg-white shadow-sm hover:border-brand-300 hover:bg-brand-50/40 hover:text-brand-800',
        secondary: 'bg-ink-50 text-ink-800 shadow-sm hover:bg-ink-100',
        ghost: 'rounded-md hover:bg-ink-50 hover:text-ink-800',
        link: 'rounded-md text-brand-600 underline-offset-4 hover:text-brand-800 hover:underline'
      },
      size: {
        default: 'h-9 px-5 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-10 px-6 text-sm',
        icon: 'h-9 w-9'
      }
    },
    defaultVariants: {
      variant: 'default',
      size: 'default'
    }
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : 'button';
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';

export { Button, buttonVariants };
