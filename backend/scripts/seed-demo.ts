import { auth } from "../src/auth.js";
import { prisma } from "../src/db.js";

const demoEmail = "demo@taxpilot.example.com";
const demoPassword = "TaxPilotDemo-Local-2026!";
const demoTin = "9999999GST999";

if (process.env.NODE_ENV === "production") {
  throw new Error("The demo account seed is disabled in production.");
}

async function seedDemo() {
  const existingUser = await prisma.user.findUnique({ where: { email: demoEmail } });
  let userId = existingUser?.id;
  if (!userId) {
    const result = await auth.api.signUpEmail({
      body: { name: "TaxPilot Demo Admin", email: demoEmail, password: demoPassword },
    });
    userId = result.user.id;
  }

  const business = await prisma.business.upsert({
    where: { tin: demoTin },
    update: { name: "Demo Island Traders", sector: "GENERAL", filingFrequency: "QUARTERLY" },
    create: {
      name: "Demo Island Traders",
      tin: demoTin,
      sector: "GENERAL",
      filingFrequency: "QUARTERLY",
      address: "Demo address, Malé",
    },
  });

  await prisma.businessMembership.upsert({
    where: { businessId_userId: { businessId: business.id, userId } },
    update: { role: "ADMIN" },
    create: { businessId: business.id, userId, role: "ADMIN" },
  });

  const existingSale = await prisma.sale.findFirst({
    where: { businessId: business.id, reference: "DEMO-SALE-001" },
  });
  if (!existingSale) {
    await prisma.sale.create({
      data: {
        businessId: business.id,
        saleDate: new Date("2026-11-04T00:00:00.000Z"),
        reference: "DEMO-SALE-001",
        customerName: "Demo customer",
        description: "Sample standard-rated sale",
        taxLines: { create: [{ rate: 8, taxableAmount: 10000, gstAmount: 800 }] },
      },
    });
  }

  const existingInvoice = await prisma.purchaseInvoice.findFirst({
    where: { businessId: business.id, invoiceNumber: "DEMO-BUY-001" },
  });
  if (!existingInvoice) {
    await prisma.purchaseInvoice.create({
      data: {
        businessId: business.id,
        status: "APPROVED",
        fileName: "demo-purchase-invoice.pdf",
        contentType: "application/pdf",
        supplierName: "Demo supplier",
        supplierTin: "1111111GST111",
        invoiceNumber: "DEMO-BUY-001",
        invoiceDate: new Date("2026-11-05T00:00:00.000Z"),
        taxLines: { create: [{ rate: 8, taxableAmount: 5000, gstAmount: 400 }] },
      },
    });
  }

  console.log("Demo workspace is ready.");
  console.log(`Email: ${demoEmail}`);
  console.log(`Password: ${demoPassword}`);
  console.log("Role: business administrator");
}

seedDemo()
  .catch((error: unknown) => {
    console.error("Could not create demo workspace:", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
