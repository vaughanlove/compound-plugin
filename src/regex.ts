import { Result } from "./error";

export function extractRegexPatternFromString(text: string, regex: RegExp): Result<string, string>{
    const match = regex.exec(text);

    if (!match){
        return {
            ok: false,
            error: "No pattern was matched in the text."
        }
    }

    if (match?.length > 1){
        return {
            ok: false,
            error: "Multiple patterns were matched in the text."
        }
    }

    return {
        ok: true,
        value: match[0]
    }
}