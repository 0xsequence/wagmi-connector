<!-- archived-repository-notice -->
> [!WARNING]
> **This repository is archived and no longer maintained.**
>
> It is part of the legacy Sequence stack and is kept here for reference only.
> It will not receive bug fixes, security patches or releases, and packages,
> images or deployments built from it are not supported.

# wagmi-connector

Wagmi connector for the [Sequence](https://sequence.xyz/) wallet.

## Install

```shell
  pnpm install @0xsequence/wagmi-connector 0xsequence
```


## Params


* `options.connectOptions` -- Connection options for the name of the app, projectAccessKey, etc...
* `options.defaultNetwork` -- Starting network
* `options.walletAppURL`   -- Url of sequence wallet to connect to

## Example of usage

```js
  import { sequenceWallet } from '@0xsequence/wagmi-connector'

  const connectors = [
    seqeunceWallet({
      connectOptions: {
        app: 'Demo-app',
        projectAccessKey: '...'
      },
      defaultNetwork: 137,
    }),
    ...otherConnectors
  ]
  
  const wagmiClient = createClient({
    autoConnect: false,
    connectors,
    provider
  })
```

A full demo is available at: https://github.com/0xsequence/demo-dapp-wagmi
