import { sequence } from '0xsequence';
import { networks } from '@0xsequence/network';
import type { ConnectOptions, Web3Provider } from '@0xsequence/provider';
import { Wallet } from '@0xsequence/provider';
import {
  createWalletClient,
  custom,
  UserRejectedRequestError
} from 'viem'
import { Connector, ConnectorData, Chain, ConnectorNotFoundError, Address } from 'wagmi';

interface Options {
  connect?: ConnectOptions & { walletAppURL?: string };
}

export class SequenceConnector extends Connector<Web3Provider, Options | undefined> {
  id = 'sequence';
  name = 'Sequence';
  // chains = chainConfigList
  ready = true;
  provider: Web3Provider | null = null;
  wallet: Wallet;
  connected = false;
  constructor({ chains, options }: { chains?: Chain[]; options?: Options }) {
    super({ chains, options });
  }
  async connect(): Promise<Required<ConnectorData>> {
    await this.initWallet()
    if (!this.wallet.isConnected()) {
      // @ts-ignore-next-line
      this?.emit('message', { type: 'connecting' })
      const e = await this.wallet.connect(this.options?.connect);
      if (e.error) {
        throw new UserRejectedRequestError(new Error(e.error));
      }
      if (!e.connected) {
        throw new UserRejectedRequestError(new Error('Wallet connection rejected'));
      }
    }

    const chainId = await this.getChainId();
    const provider = await this.getProvider();
    const account = await this.getAccount() as Address;
    provider.on("accountsChanged", this.onAccountsChanged);
    this.wallet.on('chainChanged', this.onChainChanged);
    provider.on('disconnect', this.onDisconnect);
    this.connected = true;
    return {
      account,
      chain: {
        id: chainId,
        unsupported: this.isChainUnsupported(chainId),
      },
    };
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
    this.wallet.disconnect();
  }
  async getAccount()  {
    await this.initWallet()
    return this.wallet.getAddress() as Promise<Address>;
  }
  async getChainId() {
    await this.initWallet()
    if (!this.wallet.isConnected()) {
      return this.connect().then(() => this.wallet.getChainId());
    }
    return this.wallet.getChainId();
  }
  async getProvider() {
    await this.initWallet()
    if (!this.provider) {
      const provider = this.wallet.getProvider();
      if (!provider) {
        throw new ConnectorNotFoundError('Failed to get Sequence Wallet provider.');
      }
      this.provider = provider;
    }
    return this.provider;
  }
  async getSigner() {
    await this.initWallet()
    return this.wallet.getSigner();
  }
  async isAuthorized() {
    try {
      const account = await this.getAccount();
      return !!account;
    } catch {
      return false;
    }
  }
  async switchChain(chainId: number): Promise<Chain> {
    await this.provider?.send('wallet_switchEthereumChain', [{ chainId }]);
    return { id: chainId } as Chain;
  }
  protected onAccountsChanged = (accounts: string[]) => {
    return { account: accounts[0] };
  };
  protected onChainChanged = (chain: number | string) => {
    this.provider?.emit('chainChanged', chain);
    const id = normalizeChainId(chain);
    const unsupported = this.isChainUnsupported(id);
    // @ts-ignore-next-line
    this?.emit('change', { chain: { id, unsupported } })
  };
  protected onDisconnect = () => {
    // @ts-ignore-next-line
    this?.emit('disconnect')
  };
  isChainUnsupported(chainId: number): boolean {
    return !(chainId in networks)
  }
  private async initWallet(): Promise<void> {
    if (!this.wallet) {
      const walletAppURL = this.options.connect?.walletAppURL
      if (walletAppURL) {
        this.wallet = await sequence.initWallet(undefined, { walletAppURL })
      } else {
        this.wallet = await sequence.initWallet()
      }
    }
  }
}

function normalizeChainId(chainId: string | number | bigint) {
  if (typeof chainId === 'string') return Number.parseInt(chainId, chainId.trim().substring(0, 2) === '0x' ? 16 : 10);
  if (typeof chainId === 'bigint') return Number(chainId);
  return chainId;
}
