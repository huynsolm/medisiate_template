/** 페이지·섹션·진단 모델. 웹 도구와 CLI가 함께 쓴다. */

export type Strategy = 'preset' | 'general';

export interface Theme {
  primary: string;
  preset?: 'blue' | 'gold' | 'green';
  source: 'file' | 'hospital' | 'default';
}

export type ImageKind = 'https' | 'http' | 'relative' | 'protocol-relative' | 'data' | 'other';

export interface ImageRef {
  /** 원본 문자열 그대로. resolveImageSrc는 identity다. */
  src: string;
  /** 장식 이미지면 '' */
  alt: string;
  width?: number;
  height?: number;
  kind: ImageKind;
}

export interface ImagePair {
  pc?: ImageRef;
  mo?: ImageRef;
}

/** allowlist(em, strong, b, i, br, span)를 통과한 HTML 문자열 */
export type RichText = string;

export interface SectionBackground {
  kind: 'color' | 'image';
  value: string;
  overlay?: string;
  /** 원본 변형 이름 (예: 'bg-color-2') */
  token?: string;
}

export interface SectionModifiers {
  background?: SectionBackground;
  textWhite?: boolean;
  fullBleed?: { paddingY?: string };
}

export interface SectionSource {
  file: string;
  index: number;
  classList: string[];
}

export interface SectionModel<T = unknown> {
  id: string;
  type: string;
  variant: string;
  modifiers: SectionModifiers;
  data: T;
  source?: SectionSource;
}

export const DIAGNOSTIC_CODES = [
  'UNSUPPORTED_TYPE',
  'UNKNOWN_VARIANT',
  'UNKNOWN_CLASS',
  'SCRIPT_REMOVED',
  'EVENT_ATTRIBUTE_REMOVED',
  'INLINE_STYLE_DROPPED',
  'PARSE_RECOVERED',
  'PARSE_HEURISTIC',
  'IMAGE_HTTP',
  'IMAGE_RELATIVE',
  'NON_CONTENT_FILE',
  'EMPTY_FIELD',
  'MIXED_MODE_SPLIT',
  'SSI_REMOVED',
  'INVALID_DATA',
] as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];
export type DiagnosticLevel = 'info' | 'warn' | 'error';

export interface Diagnostic {
  level: DiagnosticLevel;
  code: DiagnosticCode;
  message: string;
  sectionIndex?: number;
  location?: { line: number; col: number };
  detail?: Record<string, unknown>;
}

export interface PageMeta {
  coreVersion: string;
  hostCss: { sha256: string; savedAt: string };
}

export interface PageModel {
  version: 1;
  source?: string;
  title?: string;
  theme: Theme;
  sections: SectionModel[];
  diagnostics: Diagnostic[];
  meta: PageMeta;
}

export type FileStatus = 'success' | 'partial' | 'failed';
