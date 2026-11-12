import { BrowserRouter, Route, Routes } from "react-router-dom";
import { DefaultProviders } from "./components/providers/default.tsx";
import EmailPasswordPage from "./pages/auth/EmailPassword.tsx";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";
import AppLayout from "./pages/app/layout.tsx";
import OnboardingPage from "./pages/app/onboarding.tsx";
import DashboardPage from "./pages/app/dashboard/page-api.tsx";
import SettingsPage from "./pages/app/settings/page.tsx";
import PurchasesPage from "./pages/app/purchases/page.tsx";
import PurchaseReviewPage from "./pages/app/purchases/[id]/page.tsx";
import SalesPage from "./pages/app/sales/page.tsx";
import ReturnsPage from "./pages/app/returns/page-api.tsx";
import AuditLogPage from "./pages/app/audit/page-api.tsx";

export default function App() {
  return (
    <DefaultProviders>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<EmailPasswordPage />} />
          <Route path="/register" element={<EmailPasswordPage />} />
          <Route path="/app" element={<AppLayout />}>
            <Route path="onboarding" element={<OnboardingPage />} />
            <Route index element={<DashboardPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="purchases" element={<PurchasesPage />} />
            <Route path="purchases/:id" element={<PurchaseReviewPage />} />
            <Route path="sales" element={<SalesPage />} />
            <Route path="returns" element={<ReturnsPage />} />
            <Route path="audit" element={<AuditLogPage />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </DefaultProviders>
  );
}
