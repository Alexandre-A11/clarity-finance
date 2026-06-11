export type Bank = {
  id: string;
  name: string;
  short: string;
  color: string; // brand color (used for avatar bg)
  fg?: string;   // brand foreground color
};

export const BANKS: Bank[] = [
  { id: "nubank",   name: "Nubank",         short: "Nu", color: "#820AD1", fg: "#ffffff" },
  { id: "itau",     name: "Itaú",           short: "Itaú", color: "#EC7000", fg: "#0a2761" },
  { id: "bradesco", name: "Bradesco",       short: "B",  color: "#CC092F", fg: "#ffffff" },
  { id: "bb",       name: "Banco do Brasil", short: "BB", color: "#FAE128", fg: "#0033A0" },
  { id: "inter",    name: "Inter",          short: "I",  color: "#FF7A00", fg: "#ffffff" },
];

export function getBank(id?: string | null): Bank | undefined {
  if (!id) return undefined;
  return BANKS.find((b) => b.id === id);
}
