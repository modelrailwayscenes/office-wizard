import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function PrimaryButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn("bg-teal-500 hover:bg-teal-600 text-black font-medium", className)}
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
      className={cn("border-slate-700 hover:bg-slate-800", className)}
      {...props}
    />
  );
}

export function GhostButton({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  return (
    <Button variant="ghost" className={cn("text-slate-400 hover:text-white", className)} {...props} />
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
