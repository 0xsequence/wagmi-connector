import { sequence } from '0xsequence'

import { UserRejectedRequestError, getAddress } from 'viem'

import { createConnector } from 'wagmi'

export interface SequenceParameters {
  walletAppURL?: string
  defaultNetwork?: sequence.network.ChainIdLike
  connectOptions?: sequence.provider.ConnectOptions
}

sequenceWallet.type = 'sequence' as const

export function sequenceWallet(params: SequenceParameters) {
  type Provider = sequence.provider.SequenceProvider

  return createConnector<Provider>(config => ({
    id: 'sequence',
    name: 'Sequence Wallet',
    type: sequenceWallet.type,

    async setup() {
      const provider = await this.getProvider()

      provider.on('chainChanged', this.onChainChanged.bind(this))
      provider.on('accountsChanged', this.onAccountsChanged.bind(this))
      provider.on('disconnect', this.onDisconnect.bind(this))
    },

    async connect() {
      const { connectOptions } = params
      const provider = await this.getProvider()

      if (!provider.isConnected()) {
        const res = await provider.connect(connectOptions)

        if (res.error) {
          throw new UserRejectedRequestError(new Error(res.error))
        }

        if (!res.connected) {
          throw new UserRejectedRequestError(
            new Error('Wallet connection rejected')
          )
        }
      }

      const accounts = await this.getAccounts()

      return {
        accounts,
        chainId: provider.getChainId(),
      }
    },

    async disconnect() {
      const provider = await this.getProvider()

      return provider.disconnect()
    },

    async getAccounts() {
      const provider = await this.getProvider()
      const account = getAddress(await provider.getSigner().getAddress())

      return [account]
    },

    async getChainId() {
      const provider = await this.getProvider()

      const chainId = provider.getChainId()
      return chainId
    },

    async getProvider() {
      try {
        const provider = sequence.getWallet()

        return provider
      } catch (err) {
        const { connectOptions, defaultNetwork, walletAppURL } = params
        const provider = sequence.initWallet(connectOptions?.projectAccessKey, {
          defaultNetwork: defaultNetwork,
          transports: {
            walletAppURL: walletAppURL || 'https://sequence.app',
          },
          defaultEIP6492: true,
        })
        const chainId = provider.getChainId()
        config.emitter.emit('change', { chainId: normalizeChainId(chainId) })

        return provider
      }
    },

    async isAuthorized() {
      try {
        const account = await this.getAccounts()
        return !!account.length
      } catch (e) {
        return false
      }
    },

    async switchChain({ chainId }) {
      const provider = await this.getProvider()

      const chain =
        config.chains.find(c => c.id === chainId) || config.chains[0]
      provider.setDefaultChainId(normalizeChainId(chainId))

      config.emitter.emit('change', { chainId })

      return chain
    },

    async onAccountsChanged(accounts) {
      config.emitter.emit('change', {
        accounts: accounts.map(address => getAddress(address)),
      })
    },

    async onChainChanged(chain) {
      const provider = await this.getProvider()

      provider.setDefaultChainId(normalizeChainId(chain))
      config.emitter.emit('change', { chainId: normalizeChainId(chain) })
    },

    async onConnect(connectInfo) {
      const accounts = await this.getAccounts()

      config.emitter.emit('connect', {
        accounts,
        chainId: Number(connectInfo.chainId),
      })
    },

    async onDisconnect() {
      config.emitter.emit('disconnect')
    },
  }))
}

function normalizeChainId(
  chainId: string | number | bigint | { chainId: string }
) {
  if (typeof chainId === 'object') return normalizeChainId(chainId.chainId)
  if (typeof chainId === 'string')
    return Number.parseInt(
      chainId,
      chainId.trim().substring(0, 2) === '0x' ? 16 : 10
    )
  if (typeof chainId === 'bigint') return Number(chainId)
  return chainId
}
