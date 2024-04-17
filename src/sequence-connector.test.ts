import { expect, test } from 'vitest'

import { sequenceWallet } from './sequence-connector.js'
import { createConfig, http } from 'wagmi'
import { mainnet } from 'viem/chains'

export const config = createConfig({
  chains: [mainnet],
  connectors: [],
  pollingInterval: 100,
  storage: null,
  transports: {
    [mainnet.id]: http(),
  },
})

test('setup', () => {
  const connectorFn = sequenceWallet({
    connectOptions: {
      app: 'test',
      projectAccessKey: 'test',
    },
  })
  const connector = config._internal.connectors.setup(connectorFn)
  expect(connector.name).toEqual('Sequence Wallet')
})
