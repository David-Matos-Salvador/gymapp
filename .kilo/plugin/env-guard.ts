import type { Plugin } from "@kilocode/plugin"

const EnvGuard: Plugin = async () => ({
  "tool.execute.before": async (input, output) => {
    if (input.tool !== "read" && input.tool !== "edit" && input.tool !== "write") return

    const filePath = String(output.args.filePath ?? "")
    const isEnvFile = /(^|\/)\.env(\.[^/]+)?$/.test(filePath)
    const isExample = filePath.endsWith(".env.example")

    if (isEnvFile && !isExample) {
      throw new Error("Bloqueado: los archivos .env no se leen ni se editan desde el agente")
    }
  },
})

export default { id: "env-guard", server: EnvGuard }
