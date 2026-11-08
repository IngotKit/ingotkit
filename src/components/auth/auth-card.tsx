import type { ReactNode } from "react";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle>
          <h1 className="text-xl font-semibold">{title}</h1>
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
      {footer && <CardFooter className="justify-center text-sm text-muted-foreground">{footer}</CardFooter>}
    </Card>
  );
}

export function FormMessage({ tone, children }: { tone: "error" | "success"; children: ReactNode }) {
  return (
    <p role={tone === "error" ? "alert" : "status"} className={tone === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
      {children}
    </p>
  );
}
