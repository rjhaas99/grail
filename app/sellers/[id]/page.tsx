import { redirect } from "next/navigation";

type SellerPublicProfilePageProps = {
  params: Promise<{ id: string }>;
};

export default async function SellerPublicProfilePage({
  params,
}: SellerPublicProfilePageProps) {
  const { id } = await params;
  const collectorId = String(id || "").trim();

  redirect(collectorId ? `/collections/${encodeURIComponent(collectorId)}` : "/collections");
}
