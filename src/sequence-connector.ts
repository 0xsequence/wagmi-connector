import { sequence } from '0xsequence';
import { mainnetNetworks, testnetNetworks } from '@0xsequence/network';
import type { ConnectOptions, Web3Provider } from '@0xsequence/provider';
import { Wallet } from '@0xsequence/provider';
import { Connector, ConnectorData, ConnectorNotFoundError, UserRejectedRequestError, Chain, Address } from 'wagmi';

interface Options {
  connect?: ConnectOptions;
}

export class SequenceConnector extends Connector<Web3Provider, Options | undefined> {
  id = 'sequence';
  name = 'Sequence';
  // chains = chainConfigList
  ready = true;
  provider: Web3Provider | null = null;
  wallet: Wallet;
  options: Options | undefined
  connected = false;
  constructor({ chains, options }: { chains?: Chain[]; options?: Options }) {
    super({ chains, options });
    sequence.initWallet();
    this.options = options
    this.wallet = sequence.getWallet();
  }
  async connect(): Promise<Required<ConnectorData<Web3Provider>>> {
    if (!this.wallet.isConnected()) {
      // @ts-ignore-next-line
      this?.emit('message', { type: 'connecting' })
      const e = await this.wallet.connect(this.options?.connect);
      if (e.error) {
        throw new UserRejectedRequestError(e.error);
      }
      if (!e.connected) {
        throw new UserRejectedRequestError('Wallet connection rejected');
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
      provider,
    };
  }
  async disconnect() {
    this.wallet.disconnect();
  }
  getAccount() {
    return this.wallet.getAddress() as Promise<Address>;
  }
  getChainId() {
    if (!this.wallet.isConnected()) {
      return this.connect().then(() => this.wallet.getChainId());
    }
    return this.wallet.getChainId();
  }
  async getProvider() {
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
    return !(mainnetNetworks.some((c) => c.chainId === chainId) || testnetNetworks.some((c) => c.chainId === chainId));
  }
}

function normalizeChainId(chainId: string | number | bigint) {
  if (typeof chainId === 'string') return Number.parseInt(chainId, chainId.trim().substring(0, 2) === '0x' ? 16 : 10);
  if (typeof chainId === 'bigint') return Number(chainId);
  return chainId;
}
