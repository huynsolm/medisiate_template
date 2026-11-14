import type { z } from 'zod';
import type { HNode } from '../html/h.ts';
import type { Diagnostic, SectionModel, SectionModifiers, Strategy } from '../model/index.ts';
import type { RenderContext } from '../render/context.ts';
import type { SourceSection } from '../parse/dom.ts';

/** 웹 폼 자동 생성용 필드 메타 */
export type FieldKind = 'text' | 'richText' | 'textarea' | 'image' | 'imagePair' | 'select' | 'number' | 'color' | 'checkbox' | 'repeat';

export interface FieldSpec {
  key: string;
  label: string;
  kind: FieldKind;
  help?: string;
  options?: Array<{ value: string; label: string }>;
  /** repeat 항목의 필드 */
  fields?: FieldSpec[];
  min?: number;
  max?: number;
  required?: boolean;
}

export interface ParseContext {
  diagnostics: Diagnostic[];
}

export interface ParseResult<T> {
  data: T;
  variant: string;
  modifiers: SectionModifiers;
  diagnostics: Diagnostic[];
  /** 원본 정보를 하나도 버리지 않았으면 true */
  lossless: boolean;
  /** 값이 있으면 원본 정보를 잃는다는 뜻이다. 변환기는 이 섹션을 fallback으로 보존한다 */
  fallbackReason?: string | undefined;
}

export interface TypeDefinition<T = unknown> {
  id: string;
  label: string;
  /** 'any'는 앞뒤 섹션의 블록에 합류한다 (fallback) */
  strategy: Strategy | 'any';
  hostPreset?: string;
  variants: string[];
  schema: z.ZodType<T>;
  fields: FieldSpec[];
  defaults: T;
  /** 웹 도구 목록에서 숨김 (fallback 등) */
  hidden?: boolean;
  match?(section: SourceSection): boolean;
  parse?(section: SourceSection, ctx: ParseContext): ParseResult<T>;
  render(section: SectionModel<T>, ctx: RenderContext): HNode;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyTypeDefinition = TypeDefinition<any>;

export class TypeRegistry {
  #types = new Map<string, AnyTypeDefinition>();

  constructor(definitions: AnyTypeDefinition[] = []) {
    definitions.forEach((def) => this.register(def));
  }

  register<T>(definition: TypeDefinition<T>): void {
    if (this.#types.has(definition.id)) throw new Error(`type already registered: ${definition.id}`);
    this.#types.set(definition.id, definition);
  }

  get(id: string): TypeDefinition<unknown> | undefined {
    return this.#types.get(id) as TypeDefinition<unknown> | undefined;
  }

  list(): Array<TypeDefinition<unknown>> {
    return [...this.#types.values()] as Array<TypeDefinition<unknown>>;
  }

  /** 명시 type 클래스 → 각 타입의 match() 순서 */
  match(section: SourceSection): TypeDefinition<unknown> | undefined {
    if (section.typeId) {
      const direct = this.get(section.typeId);
      if (direct?.parse) return direct;
    }
    return this.list().find((def) => def.parse && def.match?.(section));
  }
}
