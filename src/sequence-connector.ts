import { sequence } from '0xsequence'

import {
  UserRejectedRequestError,
} from 'viem'

import {
  createConnector
} from 'wagmi'

export interface SequenceParameters {
  defaultNetwork?: sequence.network.ChainIdLike,
  connect?: sequence.provider.ConnectOptions & { walletAppURL?: string }
  projectAccessKey: string
}

sequenceWallet.type = 'sequence' as const

export function sequenceWallet(params: SequenceParameters) {
  const {  
    defaultNetwork,
    connect,
    projectAccessKey
  } = params

  const id = 'sequence'
  const name = 'Sequence'

  type Provider = sequence.provider.SequenceProvider
  type Properties = {}

  return createConnector<Provider, Properties>(config => ({
    id: 'sequence',
    name: 'Sequence',
    type: sequenceWallet.type,
    async setup() {
      const provider = await this.getProvider()
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
    async connect() {
      const provider = await this.getProvider()

      if (!provider.isConnected()) {
        const e = await provider.connect(connect)
        if (e.error) {
          throw new UserRejectedRequestError(new Error(e.error))
        }
        if (!e.connected) {
          throw new UserRejectedRequestError(new Error('Wallet connection rejected'))
        }
      }

      const account = await this.getAccounts()

      return {
        accounts: [account],
        chainId: provider.getChainId()
      }
    },
    async disconnect() {
      const provider = await this.getProvider()

      provider.disconnect()
    },
    async getAccounts() {
      const provider = await this.getProvider()

      const account = await provider.getSigner().getAddress() as `0x${string}`

      return [account]
    },
    async getProvider() {
      try {
        const provider = sequence.getWallet()
        return provider
      } catch(e) {
        const provider = sequence.initWallet(projectAccessKey, {
          defaultNetwork: defaultNetwork,
          transports: {
            walletAppURL: connect.walletAppURL || 'https://sequence.app',
          },
          defaultEIP6492: true,
        })
        return provider
      }
    },
    async isAuthorized() {
      try {
        const account = await this.getAccounts()
        return !!account
      } catch(e) {
        return false
      }
    },
    async switchChain({ chainId }) {
      const provider = await this.getProvider()

      const chain = config.chains.find(c => c.id === chainId) || config.chains[0]
      provider.setDefaultChainId(normalizeChainId(chainId))

      config.emitter.emit('change', { chainId })

      return chain
    },
    async getChainId() {
      const provider = await this.getProvider()

      const chainId = provider.getChainId()
      return chainId
    },
    async onAccountsChanged(accounts) {
      return { account: accounts[0] }
    },
    async onChainChanged(chain) {
      const provider = await this.getProvider()

      config.emitter.emit('change', { chainId: normalizeChainId(chain) })
      provider.setDefaultChainId(normalizeChainId(chain))
    },
    async onConnect(connectinfo) {
    },
    async onDisconnect() {
      config.emitter.emit('disconnect')
    }
  }))
}

function normalizeChainId(chainId: string | number | bigint | { chainId: string }) {
  if (typeof chainId === 'object') return normalizeChainId(chainId.chainId)
  if (typeof chainId === 'string') return Number.parseInt(chainId, chainId.trim().substring(0, 2) === '0x' ? 16 : 10)
  if (typeof chainId === 'bigint') return Number(chainId)
  return chainId
}
