import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogo from "@/components/brand-logo.tsx";
import { Button } from "@/components/ui/button.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { Input } from "@/components/ui/input.tsx";
import { Label } from "@/components/ui/label.tsx";
import { authClient } from "@/lib/auth-client.ts";

export default function EmailPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const registering = location.pathname === "/register";
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim().toLowerCase();
      if (registering) {
        const result = await authClient.signUp.email({
          name: name.trim(),
          email: normalizedEmail,
          password,
        });
        if (result.error) throw new Error(result.error.message || "Could not create your account.");
        navigate("/app", { replace: true });
        return;
      }

      const result = await authClient.signIn.email({ email: normalizedEmail, password });
      if (result.error) throw new Error(result.error.message || "Email or password is incorrect.");
      navigate("/app", { replace: true });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <BrandLogo />
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">{registering ? "Create your account" : "Welcome back"}</CardTitle>
          <CardDescription>
            {registering ? "Use your email and a strong password to get started." : "Sign in to open your GST workspace."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={(event) => void submit(event)}>
            {registering && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" autoComplete="name" required maxLength={120} value={name} onChange={(event) => setName(event.target.value)} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" autoComplete="email" required maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={registering ? "new-password" : "current-password"}
                required
                minLength={12}
                maxLength={128}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
              {registering && <p className="text-xs text-muted-foreground">Use at least 12 characters.</p>}
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            <Button className="w-full" type="submit" disabled={submitting}>
              {submitting ? "Please wait…" : registering ? "Create account" : "Sign in"}
            </Button>
          </form>
          <p className="mt-5 text-center text-sm text-muted-foreground">
            {registering ? "Already have an account? " : "New to TaxPilot? "}
            <Link className="font-medium text-foreground underline-offset-4 hover:underline" to={registering ? "/login" : "/register"}>
              {registering ? "Sign in" : "Create an account"}
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
