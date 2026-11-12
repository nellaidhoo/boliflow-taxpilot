import { Link } from "react-router-dom";
import { motion } from "motion/react";
import { useAuth } from "@/hooks/use-auth.ts";
import { ArrowRight, FileScan, FileSpreadsheet, ReceiptText, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button.tsx";
import { Skeleton } from "@/components/ui/skeleton.tsx";
import BrandLogo from "@/components/brand-logo.tsx";
import SiteFooter from "@/components/site-footer.tsx";

const HERO_IMAGE =
  "https://hercules-cdn.com/cdn-cgi/image/w=2048,quality=85,fit=scale-down,format=auto/file_fCykR2W7X5s9ZxXYs6fGg53H";

const STEPS = [
  {
    icon: FileScan,
    title: "Drop in purchase invoices",
    body: "PDFs or photos. Supplier TIN, invoice number, date, and GST at 8% or 17% are read for you.",
  },
  {
    icon: ReceiptText,
    title: "Add your sales",
    body: "Enter sales from your POS report once. Output tax is calculated as you go.",
  },
  {
    icon: FileSpreadsheet,
    title: "Export MIRA 205",
    body: "Input and Output Tax Statements are generated automatically, ready to submit.",
  },
];

const STATS = [
  { value: "< 30 min", label: "to prepare a quarterly return" },
  { value: "90%", label: "less manual typing" },
  { value: "100%", label: "of actions in the audit trail" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

function PrimaryCta({ authenticated, loading }: { authenticated: boolean; loading: boolean }) {
  return (
    <>
      {loading && (
        <Skeleton className="h-11 w-44" />
      )}
      {!loading && !authenticated && (
        <Button size="lg" asChild>
          <Link to="/register">Start your GST return</Link>
        </Button>
      )}
      {!loading && authenticated && (
        <Button size="lg" asChild>
          <Link to="/app">
            Open dashboard <ArrowRight />
          </Link>
        </Button>
      )}
    </>
  );
}

export default function Index() {
  const { isAuthenticated, isLoading } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      <header className="absolute inset-x-0 top-0 z-20">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <BrandLogo className="text-white [&_span:first-child]:bg-white/15 [&_span:first-child]:backdrop-blur" />
          {!isLoading && !isAuthenticated && (
            <Button variant="secondary" size="sm" asChild>
              <Link to="/login">Sign in</Link>
            </Button>
          )}
          {!isLoading && isAuthenticated && (
            <Button variant="secondary" size="sm" asChild>
              <Link to="/app">Dashboard</Link>
            </Button>
          )}
        </div>
      </header>

      <section className="relative isolate overflow-hidden">
        <img
          src={HERO_IMAGE}
          alt="Aerial view of a Maldivian lagoon"
          className="absolute inset-0 -z-10 size-full object-cover"
        />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[oklch(0.2_0.05_220/0.92)] via-[oklch(0.25_0.06_215/0.7)] to-transparent" />
        <motion.div
          initial="hidden"
          animate="show"
          transition={{ staggerChildren: 0.12 }}
          className="mx-auto flex min-h-[640px] max-w-6xl flex-col justify-center px-6 pb-20 pt-32 text-white md:min-h-[720px]"
        >
          <motion.span
            variants={fadeUp}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="mb-5 w-fit rounded-full border border-white/25 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] backdrop-blur"
          >
            GST for Maldives businesses
          </motion.span>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-2xl text-balance font-serif text-5xl font-medium leading-[1.05] md:text-7xl"
          >
            From invoice to tax return.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mt-6 max-w-xl text-lg text-white/80"
          >
            TaxPilot reads your supplier invoices, tracks your sales, and builds your MIRA 205
            GST return. Review the exceptions, skip the spreadsheets.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="mt-10 flex flex-wrap items-center gap-4"
          >
            <PrimaryCta authenticated={isAuthenticated} loading={isLoading} />
            <span className="flex items-center gap-2 text-sm text-white/70">
              <ShieldCheck className="size-4" /> Every change is audit-logged
            </span>
          </motion.div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-accent-foreground">
            How it works
          </p>
          <h2 className="mt-3 text-balance font-serif text-4xl font-medium">
            Enter data once. Tax forms are just outputs.
          </h2>
        </div>
        <div className="mt-14 grid gap-6 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1, ease: "easeOut" }}
              className="relative rounded-2xl border bg-card p-7"
            >
              <span className="absolute right-6 top-5 font-serif text-5xl text-muted-foreground/20">
                {i + 1}
              </span>
              <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <step.icon className="size-5" />
              </span>
              <h3 className="mt-6 text-lg font-semibold">{step.title}</h3>
              <p className="mt-2 text-muted-foreground">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="border-y bg-secondary/50">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-16 sm:grid-cols-3">
          {STATS.map((stat) => (
            <div key={stat.label}>
              <div className="font-serif text-4xl font-medium text-primary">{stat.value}</div>
              <div className="mt-1 text-muted-foreground">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-24 text-center">
        <h2 className="mx-auto max-w-2xl text-balance font-serif text-4xl font-medium">
          Your next GST return, done before lunch.
        </h2>
        <div className="mt-8 flex justify-center">
          <PrimaryCta authenticated={isAuthenticated} loading={isLoading} />
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
