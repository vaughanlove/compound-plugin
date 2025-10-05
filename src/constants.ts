import { normalizePath } from "obsidian"
import { CompoundSettings } from "./interfaces"

export const DEFAULT_SETTINGS: CompoundSettings = {
    mySetting: 'default'
}

export const DEFAULT_JOURNAL_PATH = "compound"
export const DEFAULT_JOURNAL_GET_STARTED_PATH = normalizePath(`${DEFAULT_JOURNAL_PATH}/how to.md`)
export const DEFAULT_JOURNAL_GOALS_PATH = normalizePath(`${DEFAULT_JOURNAL_PATH}/goals.md`)
