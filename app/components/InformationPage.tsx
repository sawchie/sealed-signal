import type { ReactNode } from "react";
import { SiteHeader } from "@/app/components/SiteHeader";
import { SiteFooter } from "@/app/components/SiteFooter";
import styles from "./InformationPage.module.css";

export function InformationPage({ title, children }: { title: string; children: ReactNode }) {
  return <div className="app-shell app-shell--detail">
    <SiteHeader compact />
    <main className={`content-page ${styles.page}`}>
      <h1>{title}</h1>
      <article className={styles.content}>{children}</article>
    </main>
    <SiteFooter />
  </div>;
}
