"use client";

import { useParams } from "next/navigation";
import { FactoryDetailsPage } from "@/screens/superadmin/factory-details.jsx";

export default function Page() {
  const params = useParams();
  const factoryId = Array.isArray(params?.factoryId) ? params.factoryId[0] : params?.factoryId;

  return <FactoryDetailsPage factoryId={factoryId} />;
}
