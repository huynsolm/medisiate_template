/** 페이지·섹션·진단 모델. 웹 도구와 CLI가 함께 쓴다. */

export type Strategy = 'preset' | 'general';

export interface Theme {
  primary: string;
  preset?: 'blue' | 'gold' | 'green' | undefined;
  source: 'file' | 'hospital' | 'default';
}

export type ImageKind = 'https' | 'http' | 'relative' | 'protocol-relative' | 'data' | 'other';

export interface ImageRef {
  /** 원본 문자열 그대로. resolveImageSrc는 identity다. */
  src: string;
  /** 장식 이미지면 '' */
  alt: string;
  width?: number | undefined;
  height?: number | undefined;
  kind: ImageKind;
  /** 이미지를 감싼 링크(원본 <a href><img></a>, 예: 동영상 썸네일). safeHref를 통과한 주소만 */
  link?: string | undefined;
  /** 링크를 새 창으로(원본 target="_blank") */
  newTab?: boolean | undefined;
}

export interface ImagePair {
  pc?: ImageRef | undefined;
  mo?: ImageRef | undefined;
  /** 이미지가 한 장뿐이고 원본에서 한쪽 화면 전용으로 표시돼 있었으면 그 화면(예: d-none d-lg-block → 'pc'). 출력도 그 화면에서만 보인다 */
  only?: 'pc' | 'mo' | undefined;
}

/** allowlist(em, strong, b, i, br, span)를 통과한 HTML 문자열 */
export type RichText = string;

export interface SectionBackground {
  kind: 'color' | 'image';
  value: string;
  overlay?: string | undefined;
  /** 모바일 전용 배경 이미지. 있으면 value는 PC(1024px 이상 공개 화면) 전용이 된다 */
  mobile?: { value: string; color?: string | undefined } | undefined;
  /** 원본 변형 이름 (예: 'bg-color-2') */
  token?: string | undefined;
}

export interface SectionModifiers {
  background?: SectionBackground | undefined;
  textWhite?: boolean | undefined;
  fullBleed?: { paddingY?: string } | undefined;
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
  source?: SectionSource | undefined;
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
  'LOSSY_PARSE',
  'IMAGE_HTTP',
  'IMAGE_RELATIVE',
  'NON_CONTENT_FILE',
  'EMPTY_FIELD',
  'MIXED_MODE_SPLIT',
  'SSI_REMOVED',
  'INVALID_DATA',
  'PRESET_LAYOUT_FIXED',
  'UNSAFE_LINK_REMOVED',
  'STRUCTURE_RETYPED',
] as const;

export type DiagnosticCode = (typeof DIAGNOSTIC_CODES)[number];
export type DiagnosticLevel = 'info' | 'warn' | 'error';

export interface Diagnostic {
  level: DiagnosticLevel;
  code: DiagnosticCode;
  message: string;
  sectionIndex?: number | undefined;
  location?: { line: number; col: number };
  detail?: Record<string, unknown> | undefined;
}

export interface PageMeta {
  coreVersion: string;
  hostCss: { sha256: string; savedAt: string };
}

export interface PageModel {
  version: 1;
  source?: string | undefined;
  title?: string | undefined;
  theme: Theme;
  sections: SectionModel[];
  diagnostics: Diagnostic[];
  meta: PageMeta;
}

export type FileStatus = 'success' | 'partial' | 'failed';
