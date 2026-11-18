import { createFileRoute, Outlet } from "@tanstack/react-router";
import { Footer } from "../components/layout/footer";
import { Header } from "../components/layout/header";

export const Route = createFileRoute("/_main")({
  component: MainLayout,
});

function MainLayout() {
  const { viewer } = Route.useRouteContext();

  return (
    <>
      <Header viewer={viewer} />
      <main className="min-h-[100vh]">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
