import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import TopBar from "./Topbar";

export default function AppLayout() {
  const [navOpen, setNavOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 981px)");
    const onChange = () => mq.matches && setNavOpen(false);
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  return (
    <div className={`app-shell ${navOpen ? "nav-open" : ""}`}>
      {/* Desktop */}
      <div className="sidebar sidebar--desktop">
        <Sidebar />
      </div>

      {/* Mobile/Tablet Drawer */}
      <div className="sidebar-drawer" aria-hidden={!navOpen}>
        <div className="sidebar-backdrop" onClick={() => setNavOpen(false)} />
        <div className="sidebar sidebar--drawer">
          <Sidebar onNavigate={() => setNavOpen(false)} />
        </div>
      </div>

      <main className="app-main">
        <TopBar onMenuClick={() => setNavOpen((v) => !v)} />
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

