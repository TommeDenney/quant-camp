export interface PyExample { id: string; title: string; task: string; inputs: string; assumptions: string; code: string; explain: string[]; output: string; interpret: string; mistakes: string[]; module: number }
export const PY_EXAMPLES: PyExample[] = [];
