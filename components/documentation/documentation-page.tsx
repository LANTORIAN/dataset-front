"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useRef } from "react";
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
  const overviewRef = useRef<HTMLElement | null>(null);
  const devRef = useRef<HTMLElement | null>(null);
  const qaRef = useRef<HTMLElement | null>(null);

  const scrollToSection = (el: HTMLElement | null) => {
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

      <div className="mx-auto w-full max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
        <section className="animate-doc-reveal rounded-2xl border border-border/70 bg-card/75 p-4 shadow-xl backdrop-blur sm:rounded-3xl sm:p-8">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge className="gap-1.5 text-xs"><Sparkles className="size-3.5" />Documentation officielle</Badge>
            <Badge variant="secondary" className="text-xs">Lecture seule</Badge>
            <Badge variant="outline" className="gap-1.5 text-xs"><ShieldCheck className="size-3.5" />Alignee sur l&apos;app</Badge>
          </div>
          <h1 className="mt-4 text-2xl font-semibold leading-tight tracking-tight text-foreground sm:mt-5 sm:text-4xl">
            {content.hero.title}
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:mt-4 sm:text-base">
            {content.hero.subtitle}
          </p>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:flex sm:flex-wrap">
            <Button size="sm" className="w-full justify-center gap-2 sm:w-auto" onClick={() => scrollToSection(overviewRef.current)}>
              Vue globale
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-center gap-2 sm:w-auto" onClick={() => scrollToSection(devRef.current)}>
              Espace dev
            </Button>
            <Button size="sm" variant="outline" className="w-full justify-center gap-2 sm:w-auto" onClick={() => scrollToSection(qaRef.current)}>
              Espace QA
            </Button>
            <Button asChild size="sm" variant="ghost" className="w-full justify-center gap-2 sm:w-auto">
              <Link href="/projects">
                Ouvrir l&apos;application
                <ArrowUpRight className="size-3.5" />
              </Link>
            </Button>
          </div>
        </section>

        <div className="mt-6 grid gap-6">
          <section ref={overviewRef} className="animate-doc-reveal" style={{ animationDelay: "120ms" }}>
            <OverviewSection content={content.overview} />
          </section>
          <section ref={devRef} className="animate-doc-reveal" style={{ animationDelay: "200ms" }}>
            <DevSection content={content.dev} />
          </section>
          <section ref={qaRef} className="animate-doc-reveal" style={{ animationDelay: "280ms" }}>
            <QaSection content={content.qa} />
          </section>
        </div>
      </div>
    </main>
  );
}
