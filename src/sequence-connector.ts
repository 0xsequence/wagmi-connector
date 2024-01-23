import { sequence } from '0xsequence'

import {
  createWalletClient,
  custom,
  UserRejectedRequestError,
  Hex
} from 'viem'

import {
  Connector,
  createConnector
} from 'wagmi'

export interface SequenceParameters {
  defaultNetwork?: sequence.network.ChainIdLike,
  connect?: sequence.provider.ConnectOptions & { walletAppURL?: string }
}

sequenceWallet.type = 'sequence' as const

export function sequenceWallet(params: SequenceParameters) {
  const {  
    defaultNetwork,
    connect
  } = params

  const id = 'sequence'
  const name = 'Sequence'

  let provider: sequence.provider.SequenceProvider
  type Provider = sequence.provider.SequenceProvider
  type Properties = {}

  provider = sequence.initWallet({
    defaultNetwork: defaultNetwork,
    transports: {
      walletAppURL: connect.walletAppURL || 'https://sequence.app',
    },
    defaultEIP6492: true,
    projectAccessKey: connect?.projectAccessKey
  })

  return createConnector<Provider, Properties>(config => ({
    id: 'sequence',
    name: 'Sequence',
    type: sequenceWallet.type,
    async setup() {
      provider.on('chainChanged', (chainIdHex: string) => {
        // @ts-ignore-next-line
        config.emitter.emit('change', { chain: { id: normalizeChainId(chainIdHex), unsupported: false } })
      })

      provider.on('accountsChanged', (accounts: string[]) => {
        // @ts-ignore-next-line
        config.emitter.emit('accountsChanged', this.onAccountsChanged(accounts))
      })

      provider.on('disconnect', () => {
        this.onDisconnect()
      })
    },
    async connect({ chainId, isReconnecting } = {}) {
      if (!provider.isConnected()) {
        // @ts-ignore-next-line
        this?.emit('message', { type: 'connecting' })
        const e = await this.provider.connect(this.options?.connect ?? { app: 'app' })
        if (e.error) {
          throw new UserRejectedRequestError(new Error(e.error))
        }
        if (!e.connected) {
          throw new UserRejectedRequestError(new Error('Wallet connection rejected'))
        }
      }

      const account = await this.getAccount()

      return {
        accounts: [account],
        chainId: provider.getChainId()
      }
    },
    async disconnect() {
      provider.disconnect()
    },
    async getAccounts() {
      const account = await provider.getSigner().getAddress() as `0x${string}`

      return [account]
    },
    async getProvider() {
      return provider
    },
    async isAuthorized() {
      try {
        const account = await this.getAccount()
        return !!account
      } catch {
        return false
      }
    },
    async switchChain({ chainId }) {
      return config.chains[0]
    },
    async getChainId() {
      return 137
    },
    async onAccountsChanged(accounts) {
      return { account: accounts[0] }
    },
    async onChainChanged(chain) {
      provider.setDefaultChainId(normalizeChainId(chain))
    },
    async onConnect(connectinfo) {
      console.log('connected sequence wallet', connectinfo)
    },
    async onDisconnect() {
      this?.emit('disconnect')
    }
  }))
}

  // async connect(): Promise<Required<ConnectorData>> {
  //   if (!this.provider.isConnected()) {
  //     // @ts-ignore-next-line
  //     this?.emit('message', { type: 'connecting' })
  //     const e = await this.provider.connect(this.options?.connect ?? { app: 'app' })
  //     if (e.error) {
  //       throw new UserRejectedRequestError(new Error(e.error))
  //     }
  //     if (!e.connected) {
  //       throw new UserRejectedRequestError(new Error('Wallet connection rejected'))
  //     }
  //   }

  //   const account = await this.getAccount()

  //   return {
  //     account,
  //     chain: {
  //       id: this.provider.getChainId(),
  //       unsupported: this.isChainUnsupported(this.provider.getChainId()),
  //     },
  //   }
  // }

  // async getWalletClient({ chainId }: { chainId?: number } = {}): Promise<any> {
  //   const chain = this.chains.find((x) => x.id === chainId)

  //   return createWalletClient({
  //     chain,
  //     account: await this.getAccount(),
  //     transport: custom(this.provider),
  //   })
  // }

  // protected onChainChanged(chain: string | number): void {
  //   this.provider.setDefaultChainId(normalizeChainId(chain))
  // }

  // async switchChain(chainId: number): Promise<Chain> {
  //   if (this.isChainUnsupported(chainId)) {
  //     throw new Error('Unsupported chain')
  //   }

  //   this.provider.setDefaultChainId(chainId)
  //   return this.chains.find((x) => x.id === chainId) as Chain
  // }

  // async disconnect() {
  //   this.provider.disconnect()
  // }

  // getAccount() {
  //   return this.provider.getSigner().getAddress() as Promise<`0x${string}`>
  // }

  // async getChainId() {
  //   return this.provider.getChainId()
  // }

  // async getProvider() {
  //   return this.provider
  // }

  // async getSigner() {
  //   return this.provider.getSigner()
  // }

  // async isAuthorized() {
  //   try {
  //     const account = await this.getAccount()
  //     return !!account
  //   } catch {
  //     return false
  //   }
  // }

  // protected onAccountsChanged = (accounts: string[]) => {
  //   return { account: accounts[0] }
  // }

  // protected onDisconnect = () => {
  //   // @ts-ignore-next-line
  //   this?.emit('disconnect')
  // }

  // isChainUnsupported(chainId: number): boolean {
  //   return this.provider.networks.findIndex((x) => x.chainId === chainId) === -1
  // }

function normalizeChainId(chainId: string | number | bigint | { chainId: string }) {
  if (typeof chainId === 'object') return normalizeChainId(chainId.chainId)
  if (typeof chainId === 'string') return Number.parseInt(chainId, chainId.trim().substring(0, 2) === '0x' ? 16 : 10)
  if (typeof chainId === 'bigint') return Number(chainId)
  return chainId
}
