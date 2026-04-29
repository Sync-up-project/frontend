/**
 * AI 드래프트의 `erd` JSON → Mermaid `erDiagram` 소스 문자열.
 * @see backend/src/ai/schemas/erd.schema.ts
 */

/** 다이어그램 안 박스가 너무 커지지 않게 (PK·UK 우선 표시) */
const MAX_COLS_IN_ENTITY = 6;

function safeArr<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Mermaid erDiagram 식별자로 쓸 수 있게 정규화 (한글 등 유니코드 글자·숫자·밑줄 허용) */
export function sanitizeMermaidEntityId(raw: string): string {
  const s = String(raw ?? "").trim();
  if (!s) return "UNNAMED";
  // 라틴·숫자·밑줄·한글 음절(가-힣) — Mermaid 식별자에 쓰이는 범위 위주 (\p{} 는 TS 타깃에 따라 에러)
  let out = s
    .replace(/[^a-zA-Z0-9_\uAC00-\uD7A3]/g, "_")
    .replace(/_+/g, "_");
  if (out === "_" || out === "") {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return `E_${Math.abs(h)}`;
  }
  if (/^\d/.test(out)) out = `E_${out}`;
  return out.slice(0, 64);
}

/** cardinality → Mermaid 관계 화살표 (from → to 방향) */
function cardinalityToConnector(cardinality: string): string {
  const c = String(cardinality ?? "")
    .trim()
    .toUpperCase()
    .replace(/\s/g, "");
  if (c === "1:1") return "||--||";
  if (c === "N:M" || c === "M:N") return "}o--o{";
  // 기본: 1:N — from 한 개가 to 여러 개에 연결된다고 가정
  return "||--o{";
}

function mapColumnType(t: string): string {
  const x = String(t ?? "").trim().toLowerCase();
  if (!x) return "string";
  if (x.includes("int") && !x.includes("point")) return "int";
  if (x.includes("bool")) return "boolean";
  if (x.includes("json")) return "json";
  if (x.includes("text") || x.includes("varchar")) return "string";
  if (x.includes("uuid") || x.includes("cuid")) return "string";
  if (x.includes("float") || x.includes("double") || x.includes("decimal"))
    return "float";
  if (x.includes("date") || x.includes("time")) return "datetime";
  return "string";
}

type ErdColumn = {
  name?: string;
  type?: string;
  pk?: string;
  unique?: string;
  nullable?: string;
};

type ErdEntity = {
  name?: string;
  description?: string;
  columns?: ErdColumn[];
};

type ErdRelationship = {
  from_entity?: string;
  from_column?: string;
  to_entity?: string;
  to_column?: string;
  cardinality?: string;
  notes?: string;
};

export type ErdLike = {
  entities?: ErdEntity[];
  relationships?: ErdRelationship[];
};

/**
 * `erd` 객체를 Mermaid `erDiagram` 텍스트로 변환한다.
 * 빈 입력이면 안내용 최소 다이어그램을 반환한다.
 */
export function erdToMermaid(erd: unknown): string {
  const e = (erd ?? {}) as ErdLike;
  const entities = safeArr<ErdEntity>(e.entities);
  const rels = safeArr<ErdRelationship>(e.relationships);

  const lines: string[] = ["erDiagram"];

  const entityIdByOriginal = new Map<string, string>();
  for (const ent of entities) {
    const rawName = String(ent?.name ?? "").trim() || "ENTITY";
    entityIdByOriginal.set(rawName, sanitizeMermaidEntityId(rawName));
  }
  for (const r of rels) {
    for (const key of [r.from_entity, r.to_entity]) {
      const raw = String(key ?? "").trim();
      if (raw && !entityIdByOriginal.has(raw))
        entityIdByOriginal.set(raw, sanitizeMermaidEntityId(raw));
    }
  }

  for (const ent of entities) {
    const rawName = String(ent?.name ?? "").trim() || "ENTITY";
    const id = entityIdByOriginal.get(rawName) ?? sanitizeMermaidEntityId(rawName);
    const colsRaw = safeArr<ErdColumn>(ent.columns);
    const colsSorted = [...colsRaw].sort((a, b) => {
      const pri = (x: ErdColumn) => {
        const p = String(x?.pk ?? "").toLowerCase() === "yes";
        const u =
          String(x?.unique ?? "").toLowerCase() === "yes" && !p;
        if (p) return 0;
        if (u) return 1;
        return 2;
      };
      const d = pri(a) - pri(b);
      if (d !== 0) return d;
      return String(a?.name ?? "").localeCompare(String(b?.name ?? ""));
    });
    const cols = colsSorted.slice(0, MAX_COLS_IN_ENTITY);

    lines.push(`    ${id} {`);
    if (cols.length === 0) {
      lines.push(`        string info "no columns"`);
    } else {
      for (const c of cols) {
        const colName = String(c?.name ?? "col").trim() || "col";
        const mType = mapColumnType(String(c?.type ?? ""));
        const isPk = String(c?.pk ?? "").toLowerCase() === "yes";
        const isUk =
          String(c?.unique ?? "").toLowerCase() === "yes" && !isPk;
        const suffix = isPk ? " PK" : isUk ? " UK" : "";
        lines.push(`        ${mType} ${sanitizeMermaidEntityId(colName)}${suffix}`);
      }
    }
    lines.push(`    }`);
  }

  for (const r of rels) {
    const fromRaw = String(r?.from_entity ?? "").trim();
    const toRaw = String(r?.to_entity ?? "").trim();
    if (!fromRaw || !toRaw) continue;

    const fromId =
      entityIdByOriginal.get(fromRaw) ?? sanitizeMermaidEntityId(fromRaw);
    const toId = entityIdByOriginal.get(toRaw) ?? sanitizeMermaidEntityId(toRaw);
    const cardRaw = String(r?.cardinality ?? "1:N").trim() || "1:N";
    const connector = cardinalityToConnector(cardRaw);
    lines.push(`    ${fromId} ${connector} ${toId} : ""`);
  }

  if (entities.length === 0 && rels.length === 0) {
    lines.push(`    NO_DATA {`);
    lines.push(`        string message "No ERD entities or relationships"`);
    lines.push(`    }`);
  }

  return lines.join("\n");
}
