"use client";

import { useDashboard } from "@/lib/dashboard-context";
import { GeoMap } from "@/components/dashboard/GeoMap";

export default function PublicoPage() {
  const { geoData, loadingGeo } = useDashboard();

  return (
    <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
      <div className="space-y-5">
        <GeoMap geoData={geoData} loading={loadingGeo} />
      </div>
    </main>
  );
}
