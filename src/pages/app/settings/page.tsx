import BusinessProfileForm from "@/components/business-profile-form.tsx";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card.tsx";
import { useBusiness } from "../_lib/use-business.ts";

export default function SettingsPage() {
  const business = useBusiness();
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-8">
      <div>
        <h1 className="font-serif text-3xl font-medium">Settings</h1>
        <p className="mt-1 text-muted-foreground">Your GST registration details.</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
          <CardDescription>Used on every return TaxPilot prepares.</CardDescription>
        </CardHeader>
        <CardContent>
          <BusinessProfileForm key={business.updatedAt} business={business} />
        </CardContent>
      </Card>
    </div>
  );
}
