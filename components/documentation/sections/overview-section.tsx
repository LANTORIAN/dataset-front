import { AppWindow, Database, MessageSquare, LifeBuoy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DocumentationOverview } from "@/types";

const ICONS = [AppWindow, Database, MessageSquare, LifeBuoy] as const;

interface OverviewSectionProps {
  content: DocumentationOverview;
}

export function OverviewSection({ content }: OverviewSectionProps) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card/90 backdrop-blur">
      <CardHeader>
        <Badge variant="secondary" className="w-fit">Section globale</Badge>
        <CardTitle className="text-2xl">{content.title}</CardTitle>
        <CardDescription className="max-w-3xl text-sm leading-6">
          {content.intro}
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        {content.modules.map((module, index) => {
          const Icon = ICONS[index % ICONS.length];
          return (
          <article
            key={module.title}
            className="rounded-2xl border border-border/70 bg-background/65 p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            style={{ animationDelay: `${index * 90}ms` }}
          >
            <div className="mb-3 flex items-center gap-2">
              <div className="rounded-lg bg-primary/10 p-2 text-primary">
                <Icon className="size-4" />
              </div>
              <h3 className="text-base font-semibold">{module.title}</h3>
            </div>
            <ul className="space-y-2 text-sm text-muted-foreground">
              {module.points.map((point) => (
                <li key={point}>{point}</li>
              ))}
            </ul>
          </article>
          );
        })}
      </CardContent>
    </Card>
  );
}
