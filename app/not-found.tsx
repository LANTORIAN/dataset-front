import Link from "next/link";
import { FileQuestion, ArrowLeft, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center justify-center size-20 rounded-2xl bg-muted">
          <FileQuestion className="size-10 text-muted-foreground" />
        </div>
        <h1 className="text-6xl font-bold tracking-tight">404</h1>
        <p className="text-lg font-medium">Page introuvable</p>
        <p className="text-sm text-muted-foreground max-w-xs">
          La page que vous recherchez n&apos;existe pas ou a été déplacée.
        </p>
      </div>

      <div className="flex gap-3">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="javascript:history.back()">
            <ArrowLeft className="size-4" />
            Retour
          </Link>
        </Button>
        <Button asChild size="sm" className="gap-2">
          <Link href="/">
            <Home className="size-4" />
            Dashboard
          </Link>
        </Button>
      </div>
    </div>
  );
}
