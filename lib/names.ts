// A display name for a new account, so nobody has to fill in a form.
// Google sign-in usually provides the person's real name; otherwise we make
// one from the email ("jane.doe@x.com" -> Jane Doe).

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export function nameFromEmail(email: string | null | undefined) {
  const local = (email ?? "").split("@")[0].split("+")[0];
  const parts = local
    .split(/[._\-]+/)
    .map((p) => p.replace(/\d+/g, ""))
    .filter(Boolean)
    .map(capitalize);
  if (!parts.length) return { first: "Riffer", last: "" };
  return { first: parts[0], last: parts.length > 1 ? parts[parts.length - 1] : "" };
}

export function nameFromAccount(
  metadata: Record<string, unknown> | null | undefined,
  email: string | null | undefined
) {
  const str = (key: string) => (typeof metadata?.[key] === "string" ? (metadata[key] as string).trim() : "");
  const given = str("given_name");
  if (given) return { first: given, last: str("family_name") };

  const full = str("full_name") || str("name");
  if (full) {
    const [first, ...rest] = full.split(/\s+/);
    return { first, last: rest.at(-1) ?? "" };
  }
  return nameFromEmail(email);
}
