export type PublicCollectorProfile = {
  id?: string | null;
  username?: string | null;
};

export function getPublicCollectorSlug(
  profile?: PublicCollectorProfile | null,
  fallbackId?: string | null,
) {
  const username = profile?.username?.replace(/^@/, "").trim();
  const id = profile?.id?.trim() || fallbackId?.trim() || "";

  return username ? encodeURIComponent(username) : encodeURIComponent(id);
}

export function getPublicCollectorHref(
  profile?: PublicCollectorProfile | null,
  fallbackId?: string | null,
) {
  const slug = getPublicCollectorSlug(profile, fallbackId);

  return slug ? `/collections/${slug}` : "/collections";
}
