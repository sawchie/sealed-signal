import type { Metadata } from "next";
import { AdminApp } from "@/app/components/AdminApp";
import { SiteHeader } from "@/app/components/SiteHeader";

export const metadata: Metadata = {
  title: "Manage Product Data",
  description: "Protected product and market-price administration for PokeScratch.",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return (
    <div className="app-shell app-shell--detail">
      <SiteHeader compact />
      <AdminApp />
    </div>
  );
}
