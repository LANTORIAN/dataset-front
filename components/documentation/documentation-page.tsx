"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Sparkles, ArrowUpRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionSkeleton } from "./section-skeleton";
import type { DocumentationContent, DocumentationOverview, DocumentationDev, DocumentationQa } from "@/types";

const OverviewSection = dynamic<{ content: DocumentationOverview }>(
  () => import("./sections/overview-section").then((mod) => mod.OverviewSection),
  { loading: () => <SectionSkeleton title="Préparation de la vue produit..." /> }
);

const DevSection = dynamic<{ content: DocumentationDev }>(
  () => import("./sections/dev-section").then((mod) => mod.DevSection),
  { loading: () => <SectionSkeleton title="Préparation de la vue développeur..." /> }
);

const QaSection = dynamic<{ content: DocumentationQa }>(
  () => import("./sections/qa-section").then((mod) => mod.QaSection),
  { loading: () => <SectionSkeleton title="Préparation du plan qualité..." /> }
);

interface DocumentationPageProps {
  content: DocumentationContent;
}

export function DocumentationPage({ content }: DocumentationPageProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-[-140px] top-12 h-80 w-80 rounded-full bg-primary/20 blur-3xl animate-doc-float" />
        <div
          className="absolute right-[-120px] top-28 h-72 w-72 rounded-full bg-accent/30 blur-3xl animate-doc-float"
          style={{ animationDelay: "-2s" }}
        />
        <div
          className="absolute bottom-[-150px] left-[20%] h-80 w-80 rounded-full bg-chart-2/20 blur-3xl animate-doc-float"
          style={{ animationDelay: "-4s" }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="animate-doc-reveal rounded-3xl border border-border/70 bg-card/75 p-6 shadow-xl backdrop-blur sm:p-8">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="gap-1.5"><Sparkles className="size-3.5" />Documentation officielle</Badge>
            <Badge variant="secondary">Lecture seule</Badge>
            <Badge variant="outline" className="gap-1.5"><ShieldCheck className="size-3.5" />Alignee sur l&apos;app</Badge>
          </div>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            {content.hero.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">
            {content.hero.subtitle}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button asChild size="sm" className="gap-2">
              <a href="#vue-globale">Vue globale</a>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href="#dev">Espace dev</a>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2">
              <a href="#qa">Espace QA</a>
            </Button>
            <Button asChild size="sm" variant="ghost" className="gap-2">
              <Link href="/projects">
                Ouvrir l&apos;application
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </section>

        <div className="mt-6 grid gap-6">
          <section id="vue-globale" className="animate-doc-reveal" style={{ animationDelay: "120ms" }}>
            <OverviewSection content={content.overview} />
          </section>
          <section id="dev" className="animate-doc-reveal" style={{ animationDelay: "200ms" }}>
            <DevSection content={content.dev} />
          </section>
          <section id="qa" className="animate-doc-reveal" style={{ animationDelay: "280ms" }}>
            <QaSection content={content.qa} />
          </section>
        </div>
      </div>
    </main>
  );
}
