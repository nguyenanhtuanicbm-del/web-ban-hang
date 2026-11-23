import AdminSidebar from "@/components/admin/AdminSidebar";
import { signOut } from "./actions";

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar onSignOut={signOut} />
      <main className="flex-1 overflow-y-auto p-4 pt-20 lg:p-6 print:p-0">{children}</main>
    </div>
  );
}
