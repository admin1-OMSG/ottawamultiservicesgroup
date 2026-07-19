import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { PageHero } from "@/components/page-hero";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/sonner";
import { toast } from "sonner";
import { LogIn, UserPlus } from "lucide-react";

export const Route = createFileRoute("/portal")({
  head: () => ({
    meta: [
      { title: "Client Portal | Ottawa Multi Services Group" },
      { name: "description", content: "Sign in or create a client account to manage bookings, invoices and faster quotes with Ottawa Multi Services Group." },
      { property: "og:title", content: "Client Portal — Ottawa MSG" },
      { property: "og:description", content: "Sign in or create a client account." },
      { property: "og:url", content: "/portal" },
    ],
    links: [{ rel: "canonical", href: "/portal" }],
  }),
  component: PortalPage,
});

function PortalPage() {
  return (
    <div className="min-h-screen bg-background">
      <Toaster richColors position="top-center" />
      <SiteHeader />
      <PageHero eyebrow="Client Portal" title="Your bookings, invoices and quotes — in one place." />
      <section className="py-16">
        <div className="mx-auto max-w-md px-6">
          <Card className="p-6 border-border/60 shadow-soft">
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin"><LogIn className="h-4 w-4 mr-2" />Sign In</TabsTrigger>
                <TabsTrigger value="signup"><UserPlus className="h-4 w-4 mr-2" />Create Account</TabsTrigger>
              </TabsList>
              <TabsContent value="signin"><AuthForm mode="signin" /></TabsContent>
              <TabsContent value="signup"><AuthForm mode="signup" /></TabsContent>
            </Tabs>
          </Card>
          <p className="mt-4 text-center text-xs text-muted-foreground">Portal accounts are coming soon. Enter your email and we'll notify you when they're live.</p>
        </div>
      </section>
      <SiteFooter />
    </div>
  );
}

function AuthForm({ mode }: { mode: "signin" | "signup" }) {
  const [pending, setPending] = useState(false);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget as HTMLFormElement);
        const email = String(data.get("email") ?? "").trim();
        if (!/^\S+@\S+\.\S+$/.test(email)) { toast.error("Please enter a valid email."); return; }
        setPending(true);
        setTimeout(() => { setPending(false); toast.success(mode === "signin" ? "We'll email you a sign-in link." : "Account request received — we'll be in touch."); (e.currentTarget as HTMLFormElement | null)?.reset?.(); }, 600);
      }}
      className="mt-6 grid gap-4"
    >
      {mode === "signup" && (
        <div><Label className="text-sm font-semibold text-navy">Full Name</Label><Input name="name" required maxLength={80} className="mt-2 h-11" /></div>
      )}
      <div><Label className="text-sm font-semibold text-navy">Email</Label><Input name="email" type="email" required maxLength={120} className="mt-2 h-11" /></div>
      <div><Label className="text-sm font-semibold text-navy">Password</Label><Input name="password" type="password" required minLength={8} maxLength={72} className="mt-2 h-11" /></div>
      <Button type="submit" disabled={pending} className="bg-accent text-accent-foreground hover:brightness-105 h-11 mt-2">
        {pending ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
      </Button>
    </form>
  );
}
