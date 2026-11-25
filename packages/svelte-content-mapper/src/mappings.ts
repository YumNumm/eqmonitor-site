import { decode } from '@jridgewell/sourcemap-codec';
import { SpanMapKind } from 'ts-content-mapper';

export type Span = [
  virtualStart: number,
  virtualLength: number,
  originalStart: number,
  originalLength: number,
  kind: SpanMapKind,
];

interface Texts {
  original: string;
  generated: string;
}

interface Range {
  start: number;
  source: number;
  length: number;
}

const lineStartsOf = (text: string): number[] => {
  const starts = [0];
  for (
    let index = text.indexOf('\n');
    index !== -1;
    index = text.indexOf('\n', index + 1)
  ) {
    starts.push(index + 1);
  }
  return starts;
};

// ソースマップの1区間は、次の区間の手前（行の最後の区間は行末）まで続く
function rangesOf({ original, generated }: Texts, encoded: string): Range[] {
  const originalLines = lineStartsOf(original);
  const generatedLines = lineStartsOf(generated);
  return decode(encoded).flatMap((segments, line) => {
    const lineStart = generatedLines[line] ?? generated.length;
    const lineEnd = (generatedLines[line + 1] ?? generated.length + 1) - 1;
    return segments.flatMap((segment, index): Range[] => {
      const [sourceLine, sourceColumn] = [segment[2], segment[3]];
      if (sourceLine === undefined || sourceColumn === undefined) return [];
      const start = lineStart + segment[0];
      const length =
        lineStart +
        (segments.at(index + 1)?.[0] ?? lineEnd - lineStart) -
        start;
      const source =
        (originalLines[sourceLine] ?? original.length) + sourceColumn;
      return length > 0 && source <= original.length
        ? [{ start, source, length }]
        : [];
    });
  });
}

function extend(
  last: Span | undefined,
  { start, source, length }: Range,
): boolean {
  if (last?.[4] !== SpanMapKind.Verbatim) return false;
  if (last[0] + last[1] !== start || last[2] + last[3] !== source) return false;
  last[1] += length;
  last[3] += length;
  return true;
}

function append(
  spans: Span[],
  { original, generated }: Texts,
  range: Range,
): void {
  const { start, source, length } = range;
  if (
    generated.slice(start, start + length) !==
    original.slice(source, source + length)
  ) {
    spans.push([start, length, source, 0, SpanMapKind.Atom]);
    return;
  }
  if (extend(spans.at(-1), range)) return;
  spans.push([start, length, source, length, SpanMapKind.Verbatim]);
}

// svelte2tsxのソースマップ（行・列）を、TypeScriptのcontent mapperが受け取る文字位置の対応に直す。
// 生成後と元の文字列が一致する区間だけを1対1の対応にし、それ以外は元の位置1点への対応にする
export function toSpanMappings(
  original: string,
  generated: string,
  encoded: string,
): Span[] {
  const texts = { original, generated };
  const spans: Span[] = [];
  for (const range of rangesOf(texts, encoded)) append(spans, texts, range);
  return spans;
}
