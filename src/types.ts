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
  label: string;
  className: string;
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

export interface FunnelStage {
  stageId: string;
  leads: number;
  note: string;
}

export interface ROIStageCost {
  stageId: string;
  hours: number;
}

export interface ROIInput {
  avgDealValue: number;
  teamHourlyRate: number;
  monthlyRevenueTarget: number;
  stageCosts: ROIStageCost[];
}

export interface BMCData {
  partners: string[];
  activities: string[];
  value: string[];
  relationships: string[];
  segments: string[];
  resources: string[];
  channels: string[];
  costs: string[];
  revenue: string[];
}

export interface BusinessModelData {
  bmc: BMCData;
  de24: Array<{ done: boolean; notes: string }>;
}

export interface AppData {
  stages: Stage[];
  personas: Persona[];
  contentPlan: ContentMonth[];
  actions: Action[];
  funnel: FunnelStage[];
  roi: ROIInput;
  businessModel: BusinessModelData;
}

export type PageId = 'dashboard' | 'journey' | 'funnel' | 'roi' | 'personas' | 'content' | 'actions' | 'aisearch' | 'bmc';
