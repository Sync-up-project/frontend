"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { erdToMermaid } from "@/lib/draft/erdToMermaid";

let mermaidInitialized = false;

async function getMermaid() {
  const mermaid = (await import("mermaid")).default;
  if (!mermaidInitialized) {
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      // neutral 베이스 + themeVariables로 DraftViewer Card / Badge(indigo) 톤에 맞춤
      theme: "neutral",
      fontSize: 12,
      themeVariables: {
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Noto Sans KR", sans-serif',
        fontSize: "12px",
        fontWeight: "400",
        // 표면: bg-white, border-gray-200, text-gray-900/700 (Tailwind 팔레트)
        background: "#ffffff",
        mainBkg: "#ffffff",
        secondBkg: "#f9fafb",
        primaryColor: "#eef2ff",
        primaryTextColor: "#111827",
        primaryBorderColor: "#e5e7eb",
        secondaryColor: "#f3f4f6",
        secondaryTextColor: "#374151",
        secondaryBorderColor: "#e5e7eb",
        tertiaryColor: "#f3f4f6",
        tertiaryTextColor: "#6b7280",
        tertiaryBorderColor: "#e5e7eb",
        clusterBkg: "#f9fafb",
        clusterBorder: "#e5e7eb",
        // ER 박스 줄무늬 + 테두리 (erDiagram 스타일시트의 .entityBox / .node rect)
        rowEven: "#ffffff",
        rowOdd: "#f9fafb",
        nodeBorder: "#e5e7eb",
        nodeTextColor: "#374151",
        // 관계선·깃발 마커 (indigo-400 — Badge indigo 톤과만 맞춤, 과한 채도는 피함)
        lineColor: "#818cf8",
        textColor: "#111827",
        titleColor: "#111827",
        edgeLabelBackground: "#ffffff",
        edgeLabelColor: "#6b7280",
      },
      er: {
        diagramPadding: 48,
        nodeSpacing: 110,
        rankSpacing: 120,
        layoutDirection: "TB",
        entityPadding: 12,
        minEntityWidth: 128,
        minEntityHeight: 76,
        fontSize: 12,
        stroke: "#e5e7eb",
        fill: "#ffffff",
      },
      flowchart: {
        htmlLabels: true,
        useMaxWidth: true,
      },
    });
    mermaidInitialized = true;
  }
  return mermaid;
}

export type ErdMermaidDiagramProps = {
  erd: unknown;
  className?: string;
};

/**
 * 드래프트 `erd` JSON을 Mermaid `erDiagram`으로 렌더링한다.
 * SSR에서는 비우고, 클라이언트에서만 그린다.
 */
export default function ErdMermaidDiagram({
  erd,
  className = "",
}: ErdMermaidDiagramProps) {
  const reactId = useId().replace(/:/g, "");
  const mountCount = useRef(0);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);

  const definition = useMemo(() => erdToMermaid(erd), [erd]);

  useEffect(() => {
    let cancelled = false;
    mountCount.current += 1;
    const renderId = `erd-mermaid-${reactId}-${mountCount.current}`;

    setBusy(true);
    setError(null);
    setSvg(null);

    (async () => {
      try {
        const mermaid = await getMermaid();
        if (cancelled) return;
        const { svg: out } = await mermaid.render(renderId, definition);
        if (cancelled) return;
        setSvg(out);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setSvg(null);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [definition, reactId]);

  return (
    <div
      className={`rounded-xl border border-gray-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
    >
      {busy && !svg && !error && (
        <p className="p-4 text-sm text-gray-500 dark:text-neutral-400">
          다이어그램 그리는 중…
        </p>
      )}
      {error && (
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap p-4 text-xs text-red-600 dark:text-red-400">
          Mermaid 렌더 실패: {error}
        </pre>
      )}
      {svg && (
        <div
          className="overflow-x-auto bg-gray-50/80 px-4 py-5 dark:bg-neutral-950/50 [&_svg]:mx-auto [&_svg]:block [&_svg]:max-h-[min(70vh,720px)] [&_svg]:max-w-none [&_svg]:w-auto"
          // Mermaid가 만든 SVG (신뢰 경로: 로컬 erdToMermaid 정의 문자열만 파싱)
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
}
