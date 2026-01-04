export interface CombatRules {
  actions: {
    [actionName: string]: string;
  };
  conditions: {
    [conditionName: string]: string;
  };
  cover?: {
    [coverType: string]: string;
  };
  [category: string]: {
    [key: string]: string;
  } | undefined;
}
