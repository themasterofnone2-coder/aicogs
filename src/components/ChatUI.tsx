import { useState, useRef, useEffect } from 'react';
import { Send, Disc3, LogOut, Package, ShoppingCart, Plus, Calculator, FileText, Sun, Moon, Loader2 } from 'lucide-react';
import { useDiscogs } from '../DiscogsContext';
import { Message, ToolCall } from '../types';

const QUICK_ACTIONS = [
  { label: 'My listings', prompt: 'Show me my current listings' },
  { label: 'My orders', prompt: 'Show me my recent orders' },
  { label: 'Add listing', prompt: 'Help me add a new listing' },
  { label: 'Shipping calc', prompt: 'Calculate shipping cost' },
  { label: 'Update price', prompt: 'Help me update a price' },
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

export function ChatUI() {
  const { connection, setConnection, callDiscogsAPI } = useDiscogs();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      await runAgenticLoop(text);
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `Error: ${error.message || 'Something went wrong'}`,
        },
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

    const conversationHistory: any[] = [];
    conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let iterations = 0;
    const maxIterations = 5;

    const DISCOGS_TOOL = {
      name: 'discogs_api',
      description: 'Make a call to the Discogs REST API on behalf of the user.',
      input_schema: {
        type: 'object',
        properties: {
          method: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE'],
          },
          path: {
            type: 'string',
            description: 'e.g. /marketplace/listings or /users/bob/inventory',
          },
          body: {
            type: 'object',
            description: 'Request body for POST/PUT',
          },
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

      conversationHistory.push({
        role: 'assistant',
        content: response.content,
      });

      const toolUseBlocks = response.content.filter(
        (block: any) => block.type === 'tool_use'
      );

      if (toolUseBlocks.length === 0) {
        const textBlocks = response.content.filter(
          (block: any) => block.type === 'text'
        );
        const assistantText = textBlocks.map((b: any) => b.text).join('\n');

        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: assistantText },
        ]);
        break;
      }

      const toolCalls: ToolCall[] = [];
      const toolResults: any[] = [];

      for (const toolUse of toolUseBlocks) {
        const { method, path, body } = toolUse.input;

        try {
          const result = await callDiscogsAPI(method, path, body);

          toolCalls.push({
            name: toolUse.name,
            input: { method, path, body },
            result,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: JSON.stringify(result, null, 2),
          });
        } catch (error: any) {
          toolCalls.push({
            name: toolUse.name,
            input: { method, path, body },
            error: error.message,
          });

          toolResults.push({
            type: 'tool_result',
            tool_use_id: toolUse.id,
            content: `Error: ${error.message}`,
            is_error: true,
          });
        }
      }

      setMessages((prev) => [
        ...prev.slice(0, -1),
        { ...prev[prev.length - 1], toolCalls },
      ]);

      conversationHistory.push({
        role: 'user',
        content: toolResults,
      });

      if (response.stop_reason === 'end_turn') {
        break;
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col">
      <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Disc3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                Discogs Agent
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                @{connection?.username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPolicy(!showPolicy)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition"
              title="Seller Policy"
            >
              <FileText className="w-5 h-5" />
            </button>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-400 transition"
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setConnection(null)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400 transition"
            >
              <LogOut className="w-5 h-5" />
              Disconnect
            </button>
          </div>
        </div>
      </header>

      {showPolicy && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-6 py-4">
          <div className="max-w-5xl mx-auto">
            <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
              Seller Policy
            </h3>
            <pre className="text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap font-mono">
              {SELLER_POLICY}
            </pre>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <div className="bg-blue-600 p-6 rounded-full w-20 h-20 mx-auto mb-4 flex items-center justify-center">
                <Disc3 className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                Welcome to your Discogs Assistant
              </h2>
              <p className="text-slate-600 dark:text-slate-400 mb-6">
                Ask me anything about your inventory, orders, or use quick actions below
              </p>

              <div className="flex flex-wrap gap-2 justify-center">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.label}
                    onClick={() => handleSendMessage(action.prompt)}
                    className="px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition text-sm font-medium"
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx}>
              {msg.role === 'user' ? (
                <div className="flex justify-end">
                  <div className="bg-blue-600 text-white px-4 py-3 rounded-2xl rounded-tr-sm max-w-2xl">
                    {msg.content}
                  </div>
                </div>
              ) : (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm max-w-2xl">
                    {msg.toolCalls && msg.toolCalls.length > 0 && (
                      <div className="mb-3 space-y-2">
                        {msg.toolCalls.map((call, i) => (
                          <div
                            key={i}
                            className="bg-slate-50 dark:bg-slate-900 rounded-lg p-3 text-sm"
                          >
                            <div className="font-mono text-xs text-slate-500 dark:text-slate-400 mb-1">
                              {call.input.method} {call.input.path}
                            </div>
                            {call.error && (
                              <div className="text-red-600 dark:text-red-400 text-xs">
                                Error: {call.error}
                              </div>
                            )}
                            {call.result && (
                              <div className="text-green-600 dark:text-green-400 text-xs">
                                Success
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="text-slate-900 dark:text-white whitespace-pre-wrap">
                      {msg.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-4 py-3 rounded-2xl rounded-tl-sm">
                <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-6 py-4">
        <div className="max-w-5xl mx-auto">
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {QUICK_ACTIONS.map((action) => (
                <button
                  key={action.label}
                  onClick={() => handleSendMessage(action.prompt)}
                  disabled={loading}
                  className="px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition text-sm"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-2">
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
              placeholder="Ask me anything about your Discogs account..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition disabled:opacity-50"
            />
            <button
              onClick={() => handleSendMessage(input)}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white p-3 rounded-lg transition"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
