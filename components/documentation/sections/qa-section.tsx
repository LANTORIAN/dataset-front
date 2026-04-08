import { TestTube2, ShieldCheck, Workflow } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DocumentationQa } from "@/types";

interface QaSectionProps {
  content: DocumentationQa;
}

export function QaSection({ content }: QaSectionProps) {
  return (
    <Card className="overflow-hidden border-border/80 bg-card/90 backdrop-blur">
      <CardHeader className="space-y-2 p-4 sm:p-6">
        <Badge variant="outline" className="w-fit gap-1.5"><TestTube2 className="size-3.5" />Section QA</Badge>
        <CardTitle className="text-xl sm:text-2xl">{content.title}</CardTitle>
        <CardDescription className="max-w-3xl text-sm leading-6">
          {content.intro}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 p-4 pt-0 sm:space-y-6 sm:p-6 sm:pt-0">
        <div className="rounded-2xl border border-border/70 bg-background/65 p-4 sm:p-5">
          <h3 className="mb-3 flex items-center gap-2 text-base font-semibold"><Workflow className="size-4 text-primary" />Strategie QA de reference</h3>
          <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground marker:text-primary/70">
            {content.strategy.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="grid gap-3 sm:gap-4 md:grid-cols-2">
          {content.area_checks.map((item) => (
            <article key={item.area} className="rounded-2xl border border-border/70 bg-background/65 p-3.5 sm:p-4">
              <p className="mb-1 flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-3.5 text-primary" />{item.area}</p>
              <p className="text-sm text-muted-foreground">{item.checks}</p>
            </article>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
