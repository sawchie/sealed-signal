import { permanentRedirect } from "next/navigation";

// Preserve old bookmarks without retaining the retired public methodology page.
export default function MethodologyPage() {
  permanentRedirect("/");
}
