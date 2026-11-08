import Link from "next/link";
import { siteConfig } from "@/config/site.config";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16">
      <Link href="/" className="text-sm font-semibold tracking-tight">
        {siteConfig.name}
      </Link>
      {children}
    </main>
  );
}
