import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrimaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("bg-primary hover:bg-primary/90 text-primary-foreground font-medium", className)}
      {...props}
    />
  );
}

export function SecondaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className={cn("border-border hover:bg-muted", className)}
      {...props}
    />
  );
}

export function GhostButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" className={cn("text-muted-foreground hover:text-foreground", className)} {...props} />
  );
}

export function DangerButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      variant="outline"
      className={cn(
        "border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200",
        className
      )}
      {...props}
    />
  );
}
