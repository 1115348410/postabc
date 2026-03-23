/**
 * Environment variable
 */
export interface EnvironmentVariable {
  key: string;
  value: string;
  enabled: boolean;
  secret?: boolean;
}

/**
 * Environment
 */
export interface Environment {
  id: string;
  name: string;
  variables: EnvironmentVariable[];
  color?: string;
  createdAt: number;
  updatedAt: number;
}
