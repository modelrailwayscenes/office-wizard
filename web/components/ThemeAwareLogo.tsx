import { cn } from "@/lib/utils";

type ThemeAwareLogoProps = {
  alt: string;
  className?: string;
};

export function ThemeAwareLogo({ alt, className }: ThemeAwareLogoProps) {
  return (
    <>
      <img src="/api/assets/autologo?background=light" alt={alt} className={cn("block dark:hidden", className)} />
      <img src="/api/assets/autologo?background=dark" alt={alt} className={cn("hidden dark:block", className)} />
    </>
  );
}
