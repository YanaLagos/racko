import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";
import Breadcrumbs from "../common/Breadcrumbs";

export default function AppLayout() {
  return (
    <div className="app-shell">
      <Sidebar />

      <main className="app-main">
        <TopBar />
        <Breadcrumbs />

        <section className="content-wrapper">
          <Outlet />
        </section>
      </main>
    </div>
  );
}
