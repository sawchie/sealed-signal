import type { Metadata } from "next";
import { InformationPage } from "@/app/components/InformationPage";

export const metadata: Metadata = {
  title: "Contact PokeScratch",
  description: "Send product corrections, suggestions, and privacy questions to PokeScratch.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  return <InformationPage title="Contact PokeScratch">
    <p>For product corrections, suggestions, privacy questions, or rights concerns, email <a href="mailto:hello@pokescratch.com">hello@pokescratch.com</a>.</p>
    <h2>Report a catalog correction</h2>
    <p>Please include the product name or page link, the detail that needs attention, and a source showing the correct information. For a price correction, include the product edition and the date of the price you found.</p>
    <h2>Suggest a product or improvement</h2>
    <p>Tell us which product or set you would like to see, or what you were trying to do when something did not work. A short description of your device and browser can help with a website issue.</p>
    <h2>Privacy and rights requests</h2>
    <p>Use the same address for questions about personal information or material appearing on PokeScratch. Identify the page or material involved and how we can reach you. Please do not send passwords, payment details, or identity documents.</p>
    <p>PokeScratch is a catalog, not a store. Questions about an order, return, payment, or delivery should go to the retailer you purchased from.</p>
  </InformationPage>;
}
