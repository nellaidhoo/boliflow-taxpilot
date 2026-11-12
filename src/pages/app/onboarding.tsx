import { useNavigate } from "react-router-dom";
import BusinessProfileForm from "@/components/business-profile-form.tsx";
import BrandLogo from "@/components/brand-logo.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";

export default function OnboardingPage() {
  const navigate = useNavigate();

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center gap-8 p-4 py-10 md:p-10">
      <BrandLogo />
      <div>
        <p className="text-sm font-medium text-primary">Your workspace</p>
        <h1 className="mt-2 font-serif text-3xl font-medium md:text-4xl">Set up your business</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">
          Add your GST registration details to prepare tax statements and returns.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>Use the details shown on your MIRA GST registration.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm submitLabel="Create business profile" onSaved={() => navigate("/app")} />
        </CardContent>
      </Card>
    </main>
  );
}
