import { Code2, PlugZap, KeyRound, CheckCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { DocumentationDev } from "@/types";

interface DevSectionProps {
  content: DocumentationDev;
}

export function DevSection({ content }: DevSectionProps) {
  const icons = [KeyRound, PlugZap, CheckCheck] as const;

  return (
    <Card className="overflow-hidden border-border/80 bg-card/90 backdrop-blur">
      <CardHeader>
        <Badge className="w-fit gap-1.5"><Code2 className="size-3.5" />Section dev</Badge>
        <CardTitle className="text-2xl">{content.title}</CardTitle>
        <CardDescription className="max-w-3xl text-sm leading-6">
          {content.intro}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          {content.cards.map((card, index) => {
            const Icon = icons[index % icons.length];
            return (
              <article key={card.title} className="rounded-2xl border border-border/70 bg-background/65 p-4">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold"><Icon className="size-4 text-primary" />{card.title}</p>
                <p className="text-sm text-muted-foreground">{card.description}</p>
              </article>
            );
          })}
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/65 p-5">
          <h3 className="mb-3 text-base font-semibold">Workflow recommande pour brancher une API externe</h3>
          <ol className="space-y-2 text-sm text-muted-foreground">
            {content.integration_steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </div>

        <div className="rounded-2xl border border-border/70 bg-secondary/40 p-5">
          <p className="mb-2 text-sm font-semibold">Exemple de payload converti avant ingestion</p>
          <pre className="overflow-x-auto rounded-xl border border-border/70 bg-background p-4 text-xs text-foreground">
            {content.payload_example}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
