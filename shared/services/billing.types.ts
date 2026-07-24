export type Wallet = {
  id: string;
  user_id: string;
  credits: number; // available credits
  total_used: number; // cumulative used
  created_at: string;
  updated_at: string;
};

export type AIUsage = {
  id: string;
  user_id: string;
  service: string; // e.g., 'text-generation', 'chat', 'image'
  model: string;
  input_tokens: number;
  output_tokens: number;
  credits_used: number;
  cost_usd: number;
  status: 'pending' | 'completed' | 'failed';
  created_at: string;
};

export type AIPricing = {
  id: string;
  service: string;
  model: string;
  credits: number;
  cost_usd: number;
  enabled: boolean;
  created_at: string;
};

export type Plan = {
  id: string;
  name: string;
  price: number; // in cents
  credits: number;
  duration_days: number;
  enabled: boolean;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  start_time: string;
  expire_time: string;
  status: 'active' | 'expired' | 'cancelled';
  created_at: string;
};
