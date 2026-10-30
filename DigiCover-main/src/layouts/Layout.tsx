// src/layouts/Layout.tsx

import Navbar from "../components/Navbar";
import { Outlet } from "react-router-dom";

const Layout = () => {
  return (
    <div style={{ width: "100%", display: "flex", flexDirection: "column"  }}>
      <Navbar />
      <div style={{ flex: 1, paddingTop: "1px"}}>
        <Outlet />
      </div>
    </div>
  );
};

export default Layout;