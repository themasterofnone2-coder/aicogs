import { useState, useRef, useEffect } from 'react';
import {
  Send, Disc3, LogOut, Package, ShoppingCart, Plus, Calculator,
  TrendingUp, FileText, Sun, Moon, Terminal, CheckCircle2, XCircle,
} from 'lucide-react';
import { useDiscogs } from '../DiscogsContext';
import { Message, ToolCall } from '../types';

interface Props {
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

const QUICK_ACTIONS = [
  { label: 'My listings',  prompt: 'Show me my current listings',  icon: Package },
  { label: 'My orders',    prompt: 'Show me my recent orders',      icon: ShoppingCart },
  { label: 'Add listing',  prompt: 'Help me add a new listing',     icon: Plus },
  { label: 'Shipping',     prompt: 'Calculate shipping cost',       icon: Calculator },
  { label: 'Update price', prompt: 'Help me update a price',        icon: TrendingUp },
];

const SELLER_POLICY = `All records ship from Switzerland via Swiss Post. Every order is packed carefully: records are removed from outer sleeves, wrapped in a protective inner sleeve, sandwiched between stiff cardboard, and placed in a purpose-made record mailer.

Payment expected within 5 days of purchase.

SHIPPING RATES (CHF, worldwide):

7" singles
  1–2 records  (~150–250g)  → CHF 9.50
  3–5 records  (~300–500g)  → CHF 14.50

12" LPs
  1 record     (~400g)      → CHF 14.50
  2–3 records  (~800g–1.2kg)→ CHF 20.50–25.50
  4–5 records  (~1.5–2kg)   → CHF 25.50–30.50
  6+ records   (2kg+)       → CHF 36.00 (PostPac)

Double LPs / gatefolds / box sets
  1 item       (~650g)      → CHF 20.50
  2 items      (~1.3kg)     → CHF 25.50
  3+ items     (2kg+)       → CHF 36.00 (PostPac)

Combined orders ship as one package — shipping charged once only.
Import duties and local VAT are the buyer's responsibility.
All customs declarations reflect the true value of the item.`;

export function ChatUI({ darkMode, onToggleDarkMode }: Props) {
  const { connection, setConnection, callDiscogsAPI } = useDiscogs();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages((prev) => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);
    try {
      await runAgenticLoop(text);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: `Error: ${error.message || 'Something went wrong'}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const runAgenticLoop = async (userMessage: string) => {
    const systemPrompt = `You are a Discogs marketplace assistant for seller "${connection?.username}".
You have access to the discogs_api tool. Always use it — never just describe what you would do.

Key rules:
- Release refs like [r1244302] mean release_id = 1244302 (integer)
- Price is always a plain number, no currency symbol (e.g. 1000 not "CHF 1000")
- Condition values EXACTLY: "Mint (M)", "Near Mint (NM or M-)", "Very Good Plus (VG+)", "Very Good (VG)", "Good Plus (G+)", "Good (G)", "Fair (F)", "Poor (P)"
- Default status for new listings: "For Sale"
- Default location: "Switzerland"

Common endpoints:
- Inventory:    GET /users/{username}/inventory?status=For+Sale&per_page=25
- Orders:       GET /marketplace/orders?per_page=25
- Profile:      GET /users/{username}
- Create listing: POST /marketplace/listings
  body: { release_id, condition, sleeve_condition, price, status, location }
- Update listing: POST /marketplace/listings/{id}
  body: { release_id, condition, sleeve_condition, price, status, location }
- Delete listing: DELETE /marketplace/listings/{id}
- Release info: GET /releases/{id}
- Order detail: GET /marketplace/orders/{id}

Swiss Post rates from Switzerland (CHF, worldwide):
Small Goods (up to 2kg):
  100g  → CHF 4.50
  250g  → CHF 9.50
  500g  → CHF 14.50
  1000g → CHF 20.50
  1500g → CHF 25.50
  2000g → CHF 30.50
PostPac International (tracked, 2kg+):
  2kg  → CHF 36.00
  5kg  → CHF 46.00
  10kg → CHF 52.00

Typical vinyl weights (packed):
  7" single:       ~150g
  12" single LP:   ~400g
  Double LP/gatefold: ~650g

Be concise and friendly. Always confirm actions with the listing_id or order_id from the result.`;

    const conversationHistory: any[] = [{ role: 'user', content: userMessage }];
    let iterations = 0;
    const maxIterations = 5;

    const DISCOGS_TOOL = {
      name: 'discogs_api',
      description: 'Make a call to the Discogs REST API on behalf of the user.',
      input_schema: {
        type: 'object',
        properties: {
          method: { type: 'string', enum: ['GET', 'POST', 'PUT', 'DELETE'] },
          path: { type: 'string', description: 'e.g. /marketplace/listings or /users/bob/inventory' },
          body: { type: 'object', description: 'Request body for POST/PUT' },
        },
        required: ['method', 'path'],
      },
    };

    while (iterations < maxIterations) {
      iterations++;

      const res = await fetch('/api/claude', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 4096,
          system: systemPrompt,
          tools: [DISCOGS_TOOL],
          messages: conversationHistory,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`API Error: ${errorText}`);
      }

      const response = await res.json();
      conversationHistory.push({ role: 'assistant', content: response.content });

      const toolUseBlocks = response.content.filter((block: any) => block.type === 'tool_use');

      if (toolUseBlocks.length === 0) {
        const assistantText = response.content
          .filter((b: any) => b.type === 'text')
          .map((b: any) => b.text)
          .join('\n');
        setMessages((prev) => [...prev, { role: 'assistant', content: assistantText }]);
        break;
      }

      const toolCalls: ToolCall[] = [];
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        const { method, path, body } = toolUse.input;
        try {
          const result = await callDiscogsAPI(method, path, body);
          toolCalls.push({ name: toolUse.name, input: { method, path, body }, result });
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result, null, 2) });
        } catch (error: any) {
          toolCalls.push({ name: toolUse.name, input: { method, path, body }, error: error.message });
          toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: `Error: ${error.message}`, is_error: true });
        }
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...prev[prev.length - 1], toolCalls },
      ]);

      conversationHistory.push({ role: 'user', content: toolResults });

      if (response.stop_reason === 'end_turn') break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-b border-slate-200/80 dark:border-slate-700/50 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-xl blur-md opacity-40" />
              <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 p-2 rounded-xl">
                <Disc3 className="w-5 h-5 text-white" />
              </div>
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-none">Discogs Agent</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">@{connection?.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowPolicy(!showPolicy)}
              className={`p-2 rounded-lg transition text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 ${showPolicy ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : ''}`}
              title="Seller policy"
            >
              <FileText className="w-4 h-4" />
            </button>
            <button
              onClick={onToggleDarkMode}
              className="p-2 rounded-lg transition text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Toggle theme"
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setConnection(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition ml-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {/* Seller policy panel */}
      {showPolicy && (
        <div className="bg-indigo-50/80 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-800/50 px-4 py-4">
          <div className="max-w-3xl mx-auto">
            <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">Seller Policy</p>
            <pre className="text-xs text-indigo-900 dark:text-indigo-200 whitespace-pre-wrap font-mono leading-relaxed">{SELLER_POLICY}</pre>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="relative mb-5">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl blur-2xl opacity-30 scale-110" />
                <div className="relative bg-gradient-to-br from-indigo-500 to-violet-600 p-5 rounded-3xl shadow-xl">
                  <Disc3 className="w-12 h-12 text-white" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome, @{connection?.username}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 max-w-xs">
                Ask me anything about your inventory, orders, or listings
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map((action) => {
                  const Icon = action.icon;
                  return (
                    <button
                      key={action.label}
                      onClick={() => handleSendMessage(action.prompt)}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:shadow-md transition text-sm font-medium shadow-sm"
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {action.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-xl shadow-md shadow-indigo-500/20 text-sm leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0 flex items-center justify-center mt-0.5 shadow-md">
                    <Disc3 className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 px-4 py-3 rounded-2xl rounded-tl-sm max-w-xl shadow-sm">
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-3 space-y-1.5">
                        {msg.toolCalls.map((call, i) => (
                          <div key={i} className="rounded-lg overflow-hidden text-xs border border-slate-200 dark:border-slate-700">
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-100 dark:bg-slate-900">
                              <Terminal className="w-3 h-3 text-slate-400 flex-shrink-0" />
                              <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400">{call.input.method}</span>
                              <span className="font-mono text-slate-600 dark:text-slate-300 truncate">{call.input.path}</span>
                              <div className="ml-auto flex-shrink-0">
                                {call.error
                                  ? <XCircle className="w-3.5 h-3.5 text-red-500" />
                                  : <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                                }
                              </div>
                            </div>
                            {call.error && (
                              <div className="px-3 py-2 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 font-mono">
                                {call.error}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {msg.content && (
                      <p className="text-sm text-slate-800 dark:text-slate-100 whitespace-pre-wrap leading-relaxed">
                        {msg.content}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex justify-start gap-2.5">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex-shrink-0 flex items-center justify-center shadow-md">
                <Disc3 className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/50 px-4 py-3.5 rounded-2xl rounded-tl-sm shadow-sm">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area */}
      <div className="border-t border-slate-200 dark:border-slate-700/50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg px-4 py-4">
        <div className="max-w-3xl mx-auto">
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.label}
                    onClick={() => handleSendMessage(action.prompt)}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition text-xs font-medium"
                  >
                    <Icon className="w-3 h-3" />
                    {action.label}
                  </button>
                );
              })}
            </div>
          )}

          <div className="flex gap-2 items-end">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage(input);
                }
              }}
              placeholder="Ask me anything about your Discogs account…"
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition text-sm disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage(input)}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-br from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 disabled:opacity-50 text-white p-3 rounded-xl transition-all shadow-md shadow-indigo-500/25 disabled:shadow-none flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
