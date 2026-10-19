import type { SourceRef } from './types';

export interface ReferenceSection { id: string; title: string; items: { term: string; md: string; tex?: string; source?: SourceRef }[] }
export const REFERENCE: ReferenceSection[] = [];
