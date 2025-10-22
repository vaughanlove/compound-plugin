import Anthropic from '@anthropic-ai/sdk';
import { Message } from '@anthropic-ai/sdk/resources/messages';
import { Result } from './error';

export async function createClient(api_key: string): Promise<Result<Anthropic, string>> {
  const client = new Anthropic({
    apiKey: api_key,
    dangerouslyAllowBrowser: true // Electron is the "browser" so this is safe.
  });

  try {
    await client.messages.countTokens({
      model: 'claude-sonnet-4-5-20250929',
      messages: [{ role: 'user', content: 'test' }],
    });

    return {
      ok: true,
      value: client
    };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return {
        ok: false,
        error: 'Invalid API key'
      };
    }
    if (error instanceof Anthropic.PermissionDeniedError) {
      return {
        ok: false,
        error: 'Permission denied for this API key'
      };
    }
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    };
  }
}


export async function query_llm(client: Anthropic, content: string): Promise<Result<string, string>> {
  try {
    const response = await client.messages.create({
      max_tokens: 2048,
      messages: [{ role: 'user', content: content }],
      model: 'claude-sonnet-4-5-20250929',
    });

    const textBlock = response.content.find(block => block.type === 'text');
    const fullResponse = textBlock?.type === 'text' ? textBlock.text : '';

    return {
      ok: true,
      value: fullResponse
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Unknown error happened when querying the llm" 
    }
  }
  
}