# Marcus

AI-powered opinion simulation platform with virtual agents.

## 🎯 Simplified Architecture

### Core Logic (lib/core/)
- `types.ts` - All TypeScript types with Zod
- `storage.ts` - Persistence management (localStorage)
- `agent.ts` - Agent generation and management
- `reaction.ts` - Reaction generation
- `simulation.ts` - Simulation orchestration
- `llm.ts` - LLM interface (supports Ollama, OpenAI, Claude)
- `config.ts` - LLM configuration management
- `cluster.ts` - Cluster generation via LLM

### UI (app/)
- Simplified Next.js pages
- Reusable React components

## 🚀 Installation

```bash
npm install
npm run dev
```

## 📦 Dependencies

- Next.js 14
- React 18
- TypeScript
- Zod (validation)
- Tailwind CSS
- @heroicons/react

## 🔧 LLM Configuration

Marcus supports three LLM providers:

1. **Ollama** (Local) - Requires Ollama installed and running locally
2. **OpenAI** (Remote) - Requires API key
3. **Claude** (Remote) - Requires API key

### Setting up Ollama (Local)

1. **Install Ollama:**
   - macOS: `brew install ollama`
   - Linux: `curl -fsSL https://ollama.ai/install.sh | sh`
   - Windows: Download from https://ollama.ai/download

2. **Start Ollama:**
   ```bash
   ollama serve
   ```

3. **Pull a model:**
   ```bash
   ollama pull llama3
   ```

4. **Configure in Marcus:**
   - Go to Settings
   - Select "Ollama" as provider
   - Enter URL: `http://localhost:11434`
   - Enter model name: `llama3` (or any model you pulled)
   - Click "Test connection"
   - Save configuration

See `OLLAMA_SETUP.md` for detailed instructions and troubleshooting.

### Setting up OpenAI or Claude (Remote)

1. Get your API key from OpenAI or Anthropic
2. Go to Settings in Marcus
3. Select the provider
4. Enter your API key and model name
5. Test and save

## 🎨 Features

- Create and manage geographical zones
- Generate opinion clusters automatically with AI (per zone)
- Define opinion clusters manually with weights
- Generate AI agents with unique personalities
- Run opinion simulations with multiple agents
- View detailed simulation results

## 🔄 Workflow

1. **Create a Zone** - Define a geographical area
2. **Generate Clusters** - Use AI to automatically generate opinion clusters for the zone
3. **Generate Agents** - Create AI agents for each cluster
4. **Run Simulation** - Execute opinion simulations with your agents
5. **View Results** - Analyze simulation outcomes
