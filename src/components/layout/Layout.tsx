import Header from "./Header";
import Footer from "./Footer";
import Sidebar from "./Sidebar";

/** Main layout with Header + (optional Sidebar) + Main content + Footer */
export default function Layout({ children }: { children: React.ReactNode }) {
  const isAdmin = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <div className="flex flex-1">
        {isAdmin && <Sidebar />}
        <main className="flex-1">{children}</main>
      </div>
      <Footer />
    </div>
  );
}
