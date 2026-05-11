import { NavLink, Route, Routes, Navigate } from "react-router-dom";

import { ProductsPage } from "@/routes/ProductsPage";
import { ProfilesPage } from "@/routes/ProfilesPage";
import { ProfileBuilderPage } from "@/routes/ProfileBuilderPage";
import { ResolverPage } from "@/routes/ResolverPage";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const App = () => (
  <div className="layout">
    <aside className="sidebar">
      <h1>FOBOH Pricing</h1>
      <nav>
        <NavLink to="/builder" className={({ isActive }) => (isActive ? "active" : "")}>
          Build profile
        </NavLink>
        <NavLink to="/profiles" className={({ isActive }) => (isActive ? "active" : "")}>
          Profiles
        </NavLink>
        <NavLink to="/products" className={({ isActive }) => (isActive ? "active" : "")}>
          Products
        </NavLink>
        <NavLink to="/resolver" className={({ isActive }) => (isActive ? "active" : "")}>
          Resolver
        </NavLink>
        <div style={{ marginTop: 24 }}>
          <a href="/docs" target="_blank" rel="noreferrer">API docs</a>
        </div>
      </nav>
    </aside>

    <main className="main">
      <Routes>
        <Route path="/" element={<Navigate to="/builder" replace />} />
        <Route
          path="/builder"
          element={<ErrorBoundary area="builder"><ProfileBuilderPage /></ErrorBoundary>}
        />
        <Route
          path="/builder/:id"
          element={<ErrorBoundary area="builder"><ProfileBuilderPage /></ErrorBoundary>}
        />
        <Route
          path="/profiles"
          element={<ErrorBoundary area="profiles"><ProfilesPage /></ErrorBoundary>}
        />
        <Route
          path="/products"
          element={<ErrorBoundary area="products"><ProductsPage /></ErrorBoundary>}
        />
        <Route
          path="/resolver"
          element={<ErrorBoundary area="resolver"><ResolverPage /></ErrorBoundary>}
        />
        <Route path="*" element={<div className="card">Not found.</div>} />
      </Routes>
    </main>
  </div>
);
