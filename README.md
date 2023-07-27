# wagmi-connector

Wagmi connector for the [Sequence](https://sequence.xyz/) wallet.

## Install

```shell
  npm install @0xsequence/wagmi-connector 0xsequence
```
or
```shell
  yarn add @0xsequence/wagmi-connector 0xsequence
```


## Params

* `chains` -- Chains supported by app.

* `options.connect` -- Connection options for the default networkId, name of the app, etc...


## Example of usage

```js
  import { SequenceConnector } from '@0xsequence/wagmi-connector'

  const connectors = [
    new SequenceConnector({
      chains,
      options: {
        defaultNetwork: 137,

        connect: {
          app: 'Demo-app'
        }
      }
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
