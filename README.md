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
        connect: {
          app: 'Demo-app',
          networkId: 137
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
