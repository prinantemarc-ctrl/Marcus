# Ollama Setup Guide

## Installation

### macOS
```bash
brew install ollama
```

Or download from: https://ollama.ai/download

### Linux
```bash
curl -fsSL https://ollama.ai/install.sh | sh
```

### Windows
Download the installer from: https://ollama.ai/download

## Starting Ollama

After installation, start the Ollama service:

```bash
ollama serve
```

This will start Ollama on `http://localhost:11434` by default.

## Pulling Models

Before using a model, you need to pull it:

```bash
ollama pull llama3
```

Common models:
- `llama3` - Meta's Llama 3 (recommended)
- `llama3.2` - Llama 3.2 (smaller, faster)
- `mistral` - Mistral AI model
- `phi3` - Microsoft Phi-3
- `gemma2` - Google Gemma 2

## Verifying Installation

Check if Ollama is running:
```bash
curl http://localhost:11434/api/tags
```

List available models:
```bash
ollama list
```

## Configuration in Marcus

1. Go to Settings in Marcus
2. Select "Ollama" as the provider
3. Enter the Ollama URL (default: `http://localhost:11434`)
4. Enter the model name (e.g., `llama3`)
5. Click "Test connection" to verify
6. Save the configuration

## Troubleshooting

### "Cannot connect to Ollama"
- Make sure Ollama is running: `ollama serve`
- Check if the URL is correct (default: `http://localhost:11434`)
- Try accessing `http://localhost:11434/api/tags` in your browser

### "Model not found"
- Pull the model first: `ollama pull <model-name>`
- Check available models: `ollama list`
- Make sure the model name matches exactly

### "Request timeout"
- The model might be too slow for your hardware
- Try a smaller model (e.g., `llama3.2` instead of `llama3`)
- Increase timeout in the code if needed
