import type { Metadata } from "next";
import { InformationPage } from "@/app/components/InformationPage";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How PokeScratch handles website requests, essential cookies, and messages you send us.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return <InformationPage title="Privacy policy">
    <p>Last updated: September 11, 2026.</p>
    <p>This policy applies to pokescratch.com. Contact <a href="mailto:hello@pokescratch.com">hello@pokescratch.com</a> with a privacy question or request.</p>
    <h2>Browsing the catalog</h2>
    <p>You can browse PokeScratch without creating a visitor account. Search terms, filters, and calculator inputs are handled in your browser by the current catalog interface; PokeScratch does not currently save them to a personal account or collection.</p>
    <p>Our hosting and security providers process technical request information, which can include your IP address, browser information, requested pages, and request times, to deliver the website, maintain reliability, and prevent abuse.</p>
    <h2>Cookies and advertising</h2>
    <p>The current website does not run Google AdSense advertising or Google Analytics. Its hosting and security services may set necessary cookies. For example, Cloudflare uses a security cookie called __cf_bm to help distinguish legitimate traffic from automated abuse. See <a href="https://developers.cloudflare.com/fundamentals/reference/policies-compliances/cloudflare-cookies/">Cloudflare’s cookie information</a>.</p>
    <p>If advertising or optional analytics are introduced, this policy will be updated to identify the providers, explain how information is used, and provide the applicable privacy choices before those features are enabled.</p>
    <h2>Messages you send</h2>
    <p>If you email us, we receive your email address and the contents of your message, including any attachments you choose to send. We use that information to respond, investigate corrections, and handle the request. Our contact address uses ImprovMX to forward messages to our mailbox provider, so those services process the message as part of delivery.</p>
    <p>We keep correspondence as needed to handle the request and any related follow-up or applicable obligations. We do not add you to a marketing mailing list simply because you contact us.</p>
    <h2>External websites</h2>
    <p>Product and source links may take you to other websites. Those websites operate under their own privacy policies. PokeScratch does not control their content, cookies, or handling of personal information.</p>
    <h2>Your choices</h2>
    <p>You can manage cookies through your browser settings. Blocking necessary cookies may affect site functionality. You can ask us about information contained in your correspondence, or request correction or deletion, by emailing the contact address above. We will handle the request as applicable to your circumstances and any legal obligations.</p>
    <h2>Updates</h2>
    <p>We will revise this page when our practices change and update the date above. <a href="/contact">Contact us</a> if you have a question about the current policy.</p>
  </InformationPage>;
}
