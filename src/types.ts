export interface DiscogsConnection {
  username: string;
  token: string;
  connected: boolean;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: {
    method: string;
    path: string;
    body?: any;
  };
  result?: any;
  error?: string;
}

export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: any;
}
