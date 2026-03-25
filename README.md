# Discogs Seller Agent

AI-powered assistant for managing your Discogs vinyl marketplace account using Claude AI.

## Features

- **AI-Powered Chat Interface**: Natural language interaction with your Discogs account
- **Inventory Management**: View, create, update, and delete listings
- **Order Management**: View and manage your marketplace orders
- **Shipping Calculator**: Built-in Swiss Post shipping rate calculator
- **Quick Actions**: Fast access to common tasks
- **Seller Policy Display**: Easy reference to your shipping and payment terms
- **Light/Dark Mode**: Comfortable viewing in any environment

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Update the `.env` file with your Anthropic API key:

```env
VITE_ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

You can get an API key from: https://console.anthropic.com/

### 3. Get Your Discogs API Token

1. Log in to Discogs
2. Go to: https://www.discogs.com/settings/developers
3. Generate a new Personal Access Token
4. Copy the token (you'll enter it in the app UI)

### 4. Start the Application

Simply run:

```bash
npm run dev
```

The app will open at `http://localhost:5173`.

## How to Use

### Initial Setup

1. Open the app in your browser (default: http://localhost:5173)
2. Enter your Discogs username
3. Enter your Discogs API token
4. Click "Connect to Discogs"

### Chat with Your AI Assistant

Once connected, you can:

- **View listings**: "Show me my current listings"
- **Create listings**: "Add [r1244302] VG+ / VG+ CHF 1000"
- **Update prices**: "Change listing 123456 to CHF 850"
- **View orders**: "Show me my recent orders"
- **Calculate shipping**: "What's the shipping cost for 3 LPs to USA?"
- **Get help**: "How do I add a new listing?"

### Quick Actions

Use the quick action buttons for common tasks:
- My listings
- My orders
- Add listing
- Shipping calc
- Update price

### Seller Policy

Click the document icon in the header to view your full shipping and payment policy.

## Architecture

### Netlify Serverless Function

The app uses a Netlify serverless function (`netlify/functions/discogs.ts`) to proxy all Discogs API requests. This runs server-side on Bolt's Netlify infrastructure and handles authentication securely.

### Frontend (React + TypeScript)

- **SetupScreen**: Connection and authentication
- **ChatUI**: Main chat interface with Claude AI
- **DiscogsContext**: State management for connection and API calls

### AI Agent

Uses Claude (claude-sonnet-4-20250514) with tool use:
- `discogs_api` tool for making Discogs API calls
- Agentic loop (max 5 iterations) for complex tasks
- Built-in knowledge of Discogs API and shipping rates

## Security Notes

- The Discogs token is only stored in React state (memory)
- Token is never saved to localStorage or any persistent storage
- Token is cleared when you disconnect or refresh the page
- Anthropic API key should be kept secret (use environment variables)

## Common Discogs Endpoints

The AI agent can use these endpoints:

- **Inventory**: `GET /users/{username}/inventory`
- **Orders**: `GET /marketplace/orders`
- **Create Listing**: `POST /marketplace/listings`
- **Update Listing**: `POST /marketplace/listings/{id}`
- **Delete Listing**: `DELETE /marketplace/listings/{id}`
- **Release Info**: `GET /releases/{id}`
- **Order Details**: `GET /marketplace/orders/{id}`

## Shipping Rates Reference

Swiss Post rates from Switzerland (CHF, worldwide):

**Small Goods (up to 2kg):**
- 100g → CHF 4.50
- 250g → CHF 9.50
- 500g → CHF 14.50
- 1000g → CHF 20.50
- 1500g → CHF 25.50
- 2000g → CHF 30.50

**PostPac International (tracked, 2kg+):**
- 2kg → CHF 36.00
- 5kg → CHF 46.00
- 10kg → CHF 52.00

**Typical vinyl weights (packed):**
- 7" single: ~150g
- 12" single LP: ~400g
- Double LP/gatefold: ~650g

## Troubleshooting

### "Failed to connect to Discogs"
- Verify your username is correct
- Check your API token is valid
- Ensure you have an active internet connection

### "Error calling Discogs API"
- Check your token permissions
- Verify the endpoint exists in Discogs API documentation
- Check browser console for error details

### AI not responding
- Verify ANTHROPIC_API_KEY is set correctly in .env
- Check browser console for errors
- Ensure you have API credits available

## Development

Built with:
- React 18 + TypeScript
- Tailwind CSS
- Anthropic Claude SDK
- Express.js
- Lucide React (icons)
- Vite

## License

MIT
