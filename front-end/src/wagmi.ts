import { cookieStorage, createConfig, createStorage, http } from 'wagmi'
import { monadTestnet } from 'wagmi/chains'

export function getConfig() {
  return createConfig({
    chains: [monadTestnet],
    storage: createStorage({
      storage: cookieStorage,
    }),
    ssr: true,
    transports: {
      [monadTestnet.id]: http(),
    },
  })
}

declare module 'wagmi' {
  interface Register {
    config: ReturnType<typeof getConfig>
  }
}
