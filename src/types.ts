export interface Stage {
  id: string;
  label: string;
  title: string;
  emotion: string;
  touch: string[];
  action: string[];
  pain: string[];
  opp: string[];
}

export interface Persona {
  name: string;
  role: string;
  initials: string;
  bg: string;
  tc: string;
  quote: string;
  goal: string[];
  fear: string[];
  search: string[];
  action: string[];
}

export interface ContentCol {
  hd: string;
  color: string;
  items: string[];
}

export interface ContentMonth {
  label: string;
  goal: string;
  cols: ContentCol[];
}

export interface ActionTag {
  l: string;
  c: string;
}

export interface Action {
  done: boolean;
  title: string;
  desc: string;
  priority: number;
  nb: string;
  nt: string;
  tags: ActionTag[];
}

export interface AppData {
  stages: Stage[];
  personas: Persona[];
  contentPlan: ContentMonth[];
  actions: Action[];
}

export type PageId = 'journey' | 'personas' | 'content' | 'actions' | 'aisearch';
