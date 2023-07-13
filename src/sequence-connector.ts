import { sequence } from '0xsequence'

import {
  createWalletClient,
  custom,
  UserRejectedRequestError
} from 'viem'

import {
  Connector,
  ConnectorData,
  Chain,
  ConnectorNotFoundError,
  Address
} from 'wagmi'

interface Options {
  connect?: sequence.provider.ConnectOptions & { walletAppURL?: string }
}

export class SequenceConnector extends Connector<sequence.provider.Web3Provider, Options | undefined> {
  id = 'sequence'
  name = 'Sequence'

  ready = true
  provider: sequence.provider.Web3Provider | null = null
  wallet: sequence.provider.Wallet
  connected = false

  chainId?: number

  constructor({ chains, options }: { chains?: Chain[]; options?: Options }) {
    super({ chains, options })
  }

  async connect(): Promise<Required<ConnectorData>> {
    await this.initWallet()

    if (!this.wallet.isConnected()) {
      // @ts-ignore-next-line
      this?.emit('message', { type: 'connecting' })
      const e = await this.wallet.connect(this.options?.connect)
      if (e.error) {
        throw new UserRejectedRequestError(new Error(e.error))
      }
      if (!e.connected) {
        throw new UserRejectedRequestError(new Error('Wallet connection rejected'))
      }
    }

    const chainId = await this.getChainId()
    const provider = await this.getProvider()
    const account = await this.getAccount() as Address

    provider.on("accountsChanged", this.onAccountsChanged)
    provider.on('disconnect', this.onDisconnect)

    this.connected = true

    return {
      account,
      chain: {
        id: chainId,
        unsupported: this.isChainUnsupported(chainId),
      },
    }
  }

  async getWalletClient({ chainId }: { chainId?: number } = {}) {
    const [provider, account] = await Promise.all([
      this.getProvider(),
      this.getAccount(),
    ])
    const chain = this.chains.find((x) => x.id === chainId)
    if (!provider) throw new Error('provider is required.')
    return createWalletClient({
      account,
      chain,
      transport: custom(provider),
    })
  }

  async disconnect() {
    await this.initWallet()
    this.wallet.disconnect()
  }

  async getAccount()  {
    await this.initWallet()
    return this.wallet.getAddress() as Promise<Address>
  }

  async getChainId() {
    if (this.chainId) return this.chainId

    await this.initWallet()
    if (!this.wallet.isConnected()) {
      return this.connect().then(() => this.wallet.getChainId())
    }

    return this.wallet.getChainId()
  }

  async getProvider() {
    await this.initWallet()

    if (!this.provider) {
      const provider = this.wallet.getProvider(this.chainId)

      if (!provider) {
        throw new ConnectorNotFoundError('Failed to get Sequence Wallet provider.')
      }

      this.provider = this.patchProvider(provider)
    }

    return this.provider
  }

  async getSigner() {
    await this.initWallet()
    return this.wallet.getSigner(this.chainId)
  }

  async isAuthorized() {
    try {
      const account = await this.getAccount()
      return !!account
    } catch {
      return false
    }
  }

  async switchChain(chainId: number): Promise<Chain> {
    if (typeof chainId !== 'number') {
      console.warn('chainId is not a number.')
      throw new Error('chainId is not a number.')
    }

    await this.initWallet()

    // We import the networks from 0xsequence and check if the chainId is supported
    const supported = await this.wallet.getNetworks()
    if (supported.findIndex((x) => x.chainId === chainId) === -1) {
      throw new Error(`ChainId ${chainId} is not supported by Sequence Wallet.`)
    }

    // The chainId is changed locally in the connector
    this.chainId = chainId
    this?.emit('change', { chain: { id: chainId, unsupported: false } })

    // Invalidate the provider so it is recreated on next call
    this.provider = null

    return { id: chainId } as Chain
  }

  protected onChainChanged(chain: string | number): void {
    this.switchChain(normalizeChainId(chain))
  }

  protected onAccountsChanged = (accounts: string[]) => {
    return { account: accounts[0] }
  }

  protected onDisconnect = () => {
    // @ts-ignore-next-line
    this?.emit('disconnect')
  }

  private async initWallet(): Promise<void> {
    if (!this.wallet) {
      this.wallet = await sequence.initWallet(undefined, this.options.connect)
    }
  }

  /**
   * This patches the Sequence provider to add support for switching chains
   * we do this by replacing the send/sendAsync methods with our own methods
   * that intercept `wallet_switchEthereumChain` requests, and forwards everything else.
   * 
   * NOTICE: This is a temporary solution until Sequence Wallet supports switching chains
   * directly from the provider.
   * 
   */
  private patchProvider(provider: sequence.provider.Web3Provider) {
    // Capture send/sendAsync, replace them with our own
    // the only difference is that we capture wallet_switchEthereumChain
    // and call our own switchChain method
    const send = provider.send.bind(provider)
    const sendAsync = provider.sendAsync.bind(provider)
    const switchChain = this.switchChain.bind(this) as (chainId: number) => Promise<Chain>

    provider.send = (method: string, params: any[], chainId?: number) => {
      if (method === 'wallet_switchEthereumChain') {
        const args = params[0] as { chainId: string } | number | string
        return switchChain(normalizeChainId(args))
      }
      return send(method, params, chainId)
    }

    provider.sendAsync = (
      request: sequence.network.JsonRpcRequest,
      callback: sequence.network.JsonRpcResponseCallback | ((error: any, response: any) => void),
      chainId?: number
    ) => {
      if (request.method === 'wallet_switchEthereumChain') {
        const args = request.params[0] as { chainId: string } | number | string
        return switchChain(normalizeChainId(args)).then(
          (chain) => callback(null, { result: chain }),
          (error) => callback(error, null)
        )
      }

      return sendAsync(request, callback, chainId)
    }

    return provider
  }
}

function normalizeChainId(chainId: string | number | bigint | { chainId: string }) {
  if (typeof chainId === 'object') return normalizeChainId(chainId.chainId)
  if (typeof chainId === 'string') return Number.parseInt(chainId, chainId.trim().substring(0, 2) === '0x' ? 16 : 10)
  if (typeof chainId === 'bigint') return Number(chainId)
  return chainId
}
