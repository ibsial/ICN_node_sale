import chalk from 'chalk'
export const log = console.log
export const c = chalk

export async function defaultSleep(sec: number, needProgress = true) {
    if (needProgress) {
        let newpaste = ['-', `\\`, `|`, `/`]
        for (let i = 0; i < sec * 2; i++) {
            process.stdout.clearLine(0) // clear current text
            process.stdout.cursorTo(0)
            process.stdout.write(`${newpaste[i % 4]}`)
            await await new Promise((resolve) => setTimeout(resolve, 500))
        }
        process.stdout.clearLine(0) // clear current text
        process.stdout.cursorTo(0)
        return
    }
    return await new Promise((resolve) => setTimeout(resolve, sec * 1000))
}
export function getRandomElementFromArray<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)]
}
