import { execSync } from 'node:child_process'

export type BuildMetadata = {
  buildId: string
  version: string
}

type ResolveBuildIdOptions = {
  env?: NodeJS.ProcessEnv
  exec?: (command: string) => string
  now?: () => Date
}

export const BUILD_METADATA_FILE_NAME = 'build-meta.json'

const shortenGitSha = (value: string): string =>
  /^[0-9a-f]{13,}$/i.test(value) ? value.slice(0, 12) : value

const normalizeBuildId = (value: string | undefined): string | null => {
  const trimmedValue = value?.trim()
  return trimmedValue ? trimmedValue : null
}

const readEnvironmentBuildId = (env: NodeJS.ProcessEnv): string | null => {
  const explicitBuildId = normalizeBuildId(env.BUILD_ID)

  if (explicitBuildId) {
    return explicitBuildId
  }

  const githubSha = normalizeBuildId(env.GITHUB_SHA)
  return githubSha ? shortenGitSha(githubSha) : null
}

const defaultExec = (command: string): string => execSync(command, { encoding: 'utf8' }).trim()

const readGitBuildId = (exec: (command: string) => string): string | null => {
  try {
    return normalizeBuildId(exec('git rev-parse --short=12 HEAD'))
  } catch {
    return null
  }
}

export const resolveBuildId = ({
  env = process.env,
  exec = defaultExec,
  now = () => new Date(),
}: ResolveBuildIdOptions = {}): string =>
  readEnvironmentBuildId(env) ?? readGitBuildId(exec) ?? now().toISOString()

export const createBuildMetadata = (
  version: string,
  options?: ResolveBuildIdOptions,
): BuildMetadata => ({
  buildId: resolveBuildId(options),
  version,
})

export const serializeBuildMetadata = (metadata: BuildMetadata): string =>
  `${JSON.stringify(metadata, null, 2)}\n`
