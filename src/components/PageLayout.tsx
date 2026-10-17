import { AppHeader } from "@/components/AppHeader";
import Footer from "@/components/Footer";

interface PageLayoutProps {
  title?: string;
  backTo?: string | false;
  actions?: React.ReactNode;
  children: React.ReactNode;
}

/** Header + centered content + bottom navigation, shared by all logged-in pages. */
export const PageLayout = ({ title, backTo, actions, children }: PageLayoutProps) => (
  <div className="min-h-screen bg-background pb-28">
    <AppHeader title={title} backTo={backTo} actions={actions} />
    <main className="mx-auto max-w-3xl space-y-5 px-4 py-5">{children}</main>
    <Footer />
  </div>
);

export default PageLayout;
