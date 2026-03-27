export const LABEL_FOLDERS = [
    "chipox",
    "acne",
    "mpox",
    "non-skin",
    "normal",
    "not-identified",
] as const;

export type LabelFolder = (typeof LABEL_FOLDERS)[number];

const labelAliasMap: Record<string, LabelFolder> = {
    chickenpox: "chipox",
    chipox: "chipox",
    monkeypox: "mpox",
    mpox: "mpox",
    acne: "acne",
    "non-skin": "non-skin",
    nonskin: "non-skin",
    normal: "normal",
    "not-identified": "not-identified",
    notidentified: "not-identified",
};

export function normalizeLabelFolder(label: string) {
    const normalized = label.trim().toLowerCase();
    return labelAliasMap[normalized] ?? null;
}
