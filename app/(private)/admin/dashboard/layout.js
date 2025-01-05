import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/libs/next-auth";
import config from "@/config";
import Sidebar from "./Sidebar";

// This is a server-side component to ensure the user is logged in and is an admin
// If not, it will redirect to the login page.
// It's applied to all subpages of /admin/dashboard in /app/dashboard/*** pages
export default async function LayoutAdminPrivate({ children }) {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect(config.auth.loginUrl);
  }

  if (session.user.role !== "admin") {
    redirect(config.auth.callbackUrl);
  }

  return (
    <div className="drawer lg:drawer-open">
      <input id="my-drawer-2" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content">
        {/* Page content here */}
        <div className="p-4">
          <label
            htmlFor="my-drawer-2"
            className="btn btn-primary drawer-button lg:hidden mx-8"
          >
            Open Menu
          </label>
          {children}
        </div>
      </div>
      <Sidebar />
    </div>
  );
}
