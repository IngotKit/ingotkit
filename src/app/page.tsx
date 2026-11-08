import { buttonVariants } from "@/components/ui/button";
import { siteConfig } from "@/config/site.config";

// Placeholder home page for the scaffold. The real landing and pricing pages arrive in Phase 5.
export default function HomePage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-start justify-center gap-6 px-6 py-24">
      <p className="text-sm font-medium text-muted-foreground">Work in progress</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance">{siteConfig.name}</h1>
      <p className="max-w-xl text-lg text-muted-foreground text-pretty">{siteConfig.tagline}</p>
      <p className="max-w-xl text-muted-foreground text-pretty">{siteConfig.description}</p>
      <a className={buttonVariants({ size: "lg" })} href={siteConfig.links.github}>
        View on GitHub
      </a>
    </main>
  );
}
