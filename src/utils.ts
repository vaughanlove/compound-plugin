export function extract_goals_from_text(text: string) {
    // regex out goals in goals.ts
    // thought for the future: when goals are inductively created, I think I'll version control the goals by having some hidden id, and then everytime a new 
    // ai generation is prompted, the internal goal representation will update the goals.

    // capture any content between `<goal>` and `</goal>`
    const goalRegex = /<goal>(.*?)<\/goal>/g;
    const result = goalRegex.exec(text)
    console.log(result)
}

