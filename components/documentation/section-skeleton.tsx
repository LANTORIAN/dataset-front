import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SectionSkeletonProps {
  title: string;
}

export function SectionSkeleton({ title }: SectionSkeletonProps) {
  return (
    <Card className="overflow-hidden border-border/80">
      <CardHeader className="space-y-3">
        <div className="h-3 w-28 rounded-full doc-skeleton-shimmer" />
        <div className="h-8 w-56 rounded-md doc-skeleton-shimmer" />
        <p className="text-sm text-muted-foreground">{title}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="h-4 w-full rounded-md doc-skeleton-shimmer" />
        <div className="h-4 w-[92%] rounded-md doc-skeleton-shimmer" />
        <div className="h-4 w-[84%] rounded-md doc-skeleton-shimmer" />
        <div className="h-28 w-full rounded-xl doc-skeleton-shimmer" />
      </CardContent>
    </Card>
  );
}
