import Anthropic from '@anthropic-ai/sdk';

export function createClient(api_key: string): Anthropic {

  return new Anthropic({
    apiKey: api_key,
    dangerouslyAllowBrowser: true // Electron is the "browser" so this is safe.
  });
}
